-- Comprobación de los avisos al profesional (RF-30, D-47).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql) después de aplicar la migración
-- 20261118010000_notificaciones.sql. Si alguna regla falla, termina con "Falla: ..."; si todo
-- pasa, devuelve una fila con 'ok'.
-- Necesita un cliente y un profesional con cuenta (perfil con rol profesional). Usa el
-- miércoles 2 de diciembre de 2026 por la tarde (hora de Bogotá).

begin;

do $$
declare
  v_cliente uuid;
  v_cuenta_prof uuid;
  v_prof uuid;
  v_sin_cuenta uuid;
  v_dia date := '2026-12-02';
  h constant text := ' America/Bogota';
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_n integer;
  v_tipo text;
begin
  select id, profesional_id into v_cuenta_prof, v_prof
  from public.perfiles where rol = 'profesional' and profesional_id is not null limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' limit 1;
  if v_cuenta_prof is null or v_cliente is null then
    raise exception 'Falla: hace falta un cliente y un profesional con cuenta.';
  end if;

  -- 1. Cita nueva (como la crea reservar_cita): aviso "cita_nueva" para la cuenta del profesional.
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, (v_dia || ' 15:00' || h)::timestamptz, (v_dia || ' 15:30' || h)::timestamptz, 30000)
  returning id into v_a;
  select tipo into v_tipo from public.notificaciones
  where cita_id = v_a and destinatario_id = v_cuenta_prof;
  if v_tipo is distinct from 'cita_nueva' then
    raise exception 'Falla 1: la cita nueva no creó el aviso (tipo %).', v_tipo;
  end if;

  -- 2. Cita reagendada (como la crea reagendar_cita): aviso "cita_reagendada".
  update public.citas set estado = 'reagendada' where id = v_a;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total, reagendada_desde)
  values (v_cliente, v_prof, (v_dia || ' 16:00' || h)::timestamptz, (v_dia || ' 16:30' || h)::timestamptz, 30000, v_a)
  returning id into v_b;
  select tipo into v_tipo from public.notificaciones where cita_id = v_b;
  if v_tipo is distinct from 'cita_reagendada' then
    raise exception 'Falla 2: la cita reagendada no creó el aviso (tipo %).', v_tipo;
  end if;
  -- Pasar la original a "reagendada" no es una cancelación.
  select count(*) into v_n from public.notificaciones where cita_id = v_a;
  if v_n <> 1 then raise exception 'Falla 2: la original reagendada creó % avisos.', v_n; end if;

  -- 3. Cancelación: aviso "cita_cancelada"; una segunda actualización igual no repite.
  update public.citas set estado = 'cancelada_a_tiempo' where id = v_b;
  update public.citas set estado = 'cancelada_a_tiempo' where id = v_b;
  select count(*) into v_n from public.notificaciones where cita_id = v_b and tipo = 'cita_cancelada';
  if v_n <> 1 then raise exception 'Falla 3: la cancelación creó % avisos.', v_n; end if;

  -- 4. Un cambio de estado que no es cancelación no crea avisos (la asistencia exige que la
  -- cita haya empezado, así que se prueba con una actualización al mismo estado).
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, (v_dia || ' 17:00' || h)::timestamptz, (v_dia || ' 17:30' || h)::timestamptz, 30000)
  returning id into v_c;
  update public.citas set estado = 'confirmada' where id = v_c;
  select count(*) into v_n from public.notificaciones where cita_id = v_c;
  if v_n <> 1 then raise exception 'Falla 4: un cambio sin cancelar creó avisos (% en total).', v_n; end if;

  -- 5. Profesional sin cuenta: no hay a quién avisar.
  select p.id into v_sin_cuenta from public.profesionales p
  where not exists (select 1 from public.perfiles f where f.profesional_id = p.id) limit 1;
  if v_sin_cuenta is not null then
    insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
    values (v_cliente, v_sin_cuenta, (v_dia || ' 15:00' || h)::timestamptz, (v_dia || ' 15:30' || h)::timestamptz, 30000)
    returning id into v_c;
    if exists (select 1 from public.notificaciones where cita_id = v_c) then
      raise exception 'Falla 5: se creó un aviso para una ficha sin cuenta.';
    end if;
  end if;

  -- 6. El cliente no ve ni marca los avisos del profesional (RLS).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.notificaciones;
  if v_n <> 0 then raise exception 'Falla 6: el cliente ve % avisos ajenos.', v_n; end if;
  update public.notificaciones set leida_en = now() where cita_id = v_b;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'Falla 6: el cliente marcó un aviso ajeno.'; end if;
  begin
    insert into public.notificaciones (destinatario_id, cita_id, tipo) values (v_cliente, v_b, 'cita_nueva');
    raise exception 'Falla 6: la app pudo crear un aviso.';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 7. El profesional ve los suyos, los marca mostrados y leídos, y no cambia el tipo.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cuenta_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.notificaciones where cita_id in (v_a, v_b);
  if v_n <> 3 then raise exception 'Falla 7: el profesional ve % de sus 3 avisos.', v_n; end if;
  update public.notificaciones set mostrada_en = now(), leida_en = now() where cita_id in (v_a, v_b);
  get diagnostics v_n = row_count;
  if v_n <> 3 then raise exception 'Falla 7: el profesional marcó % de 3 avisos.', v_n; end if;
  begin
    update public.notificaciones set tipo = 'cita_nueva' where cita_id = v_b;
    raise exception 'Falla 7: el profesional cambió el tipo de un aviso.';
  exception when insufficient_privilege then null;
  end;
  -- La cita del aviso se puede leer con el aviso (la app arma el texto con ella).
  select count(*) into v_n from public.notificaciones n join public.citas c on c.id = n.cita_id
  where n.cita_id = v_a;
  if v_n <> 1 then raise exception 'Falla 7: el profesional no ve la cita de su aviso.'; end if;
  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
