-- Comprobación de los días de trabajo y los bloqueos (RF-24, RN-01, RN-10, D-09, D-24, D-41).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql). Si alguna regla falla, la
-- consulta termina con el error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Las escrituras se hacen como la app del administrador por HTTP (rol authenticated con su
-- jwt): upsert en dias_habilitados (on conflict por fecha), delete, e insert y delete en
-- bloqueos. validar_horario_cita no se puede llamar desde la app (solo la usa reservar_cita),
-- así que las reglas se comprueban con el rol del editor (reset role) y se vuelve al admin.
-- Necesita un perfil administrador y un cliente; crea su propio profesional.

begin;

do $$
declare
  v_admin uuid;
  v_cliente uuid;
  v_prof uuid;
  -- El domingo de la semana siguiente y el lunes que le sigue.
  v_domingo date := current_date + ((7 - extract(dow from current_date)::int) % 7 + 7);
  v_lunes date := v_domingo + 1;
  v_bloqueo uuid;
  v_n int;
begin
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' limit 1;
  if v_admin is null or v_cliente is null then
    raise exception 'Falla: hacen falta un administrador y un cliente.';
  end if;
  -- Profesional propio de la prueba (se deshace con el rollback): los bloqueos reales de un
  -- profesional no la afectan.
  insert into public.profesionales (nombre, cargo) values ('Prueba días', 'Barbero')
  returning id into v_prof;
  if exists (select 1 from public.festivos where fecha = v_lunes) then
    raise exception 'Falla: el lunes de prueba (%) es festivo; corre la prueba otro día.', v_lunes;
  end if;
  -- Datos reales que cambiarían el resultado: no es una falla de las reglas.
  if exists (select 1 from public.dias_habilitados where fecha in (v_domingo, v_lunes))
     or exists (select 1 from public.bloqueos where profesional_id is null
                and tstzrange(inicio, fin, '[)') && tstzrange(v_domingo::timestamp at time zone 'America/Bogota',
                                                              (v_lunes + 1)::timestamp at time zone 'America/Bogota', '[)')) then
    raise exception 'Falla: el % o el % ya tienen una excepción o un bloqueo del local reales; corre la prueba otro día.', v_domingo, v_lunes;
  end if;

  -- 1. Domingo cerrado por defecto (RN-10).
  begin
    perform public.validar_horario_cita(v_prof,
      (v_domingo + time '10:00') at time zone 'America/Bogota',
      (v_domingo + time '10:30') at time zone 'America/Bogota');
    raise exception 'Falla 1: el domingo sin habilitar aceptó una cita.';
  exception when raise_exception then
    if sqlerrm like 'Falla%' then raise; end if;
  end;

  -- 2. "Habilitar" 10:00 a 16:00 como el administrador.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.dias_habilitados (fecha, abierto, apertura, cierre)
  values (v_domingo, true, '10:00', '16:00')
  on conflict (fecha) do update set abierto = excluded.abierto, apertura = excluded.apertura,
    cierre = excluded.cierre, nota = excluded.nota;
  reset role;
  -- La franja de las 10:00 se acepta y el almuerzo no.
  perform public.validar_horario_cita(v_prof,
    (v_domingo + time '10:00') at time zone 'America/Bogota',
    (v_domingo + time '10:30') at time zone 'America/Bogota');
  begin
    perform public.validar_horario_cita(v_prof,
      (v_domingo + time '12:00') at time zone 'America/Bogota',
      (v_domingo + time '12:30') at time zone 'America/Bogota');
    raise exception 'Falla 2: el almuerzo se aceptó en un día habilitado.';
  exception when raise_exception then
    if sqlerrm like 'Falla%' then raise; end if;
  end;

  -- 3. Editar el horario (misma fila) y probar que manda el nuevo.
  set local role authenticated;
  insert into public.dias_habilitados (fecha, abierto, apertura, cierre, nota)
  values (v_domingo, true, '13:00', '15:00', 'Prueba')
  on conflict (fecha) do update set abierto = excluded.abierto, apertura = excluded.apertura,
    cierre = excluded.cierre, nota = excluded.nota;
  select count(*) into v_n from public.dias_habilitados where fecha = v_domingo;
  if v_n <> 1 then raise exception 'Falla 3: el upsert dejó % filas.', v_n; end if;
  reset role;
  begin
    perform public.validar_horario_cita(v_prof,
      (v_domingo + time '10:00') at time zone 'America/Bogota',
      (v_domingo + time '10:30') at time zone 'America/Bogota');
    raise exception 'Falla 3: se aceptó una cita fuera del horario editado.';
  exception when raise_exception then
    if sqlerrm like 'Falla%' then raise; end if;
  end;

  -- 4. La tabla rechaza un cierre anterior a la apertura.
  set local role authenticated;
  begin
    insert into public.dias_habilitados (fecha, abierto, apertura, cierre)
    values (v_lunes, true, '16:00', '10:00');
    raise exception 'Falla 4: se guardó un cierre anterior a la apertura.';
  exception when check_violation then null;
  end;

  -- 5. Cerrar un día normal, comprobarlo y quitar la excepción.
  insert into public.dias_habilitados (fecha, abierto, apertura, cierre)
  values (v_lunes, false, '10:00', '16:00');
  reset role;
  begin
    perform public.validar_horario_cita(v_prof,
      (v_lunes + time '10:00') at time zone 'America/Bogota',
      (v_lunes + time '10:30') at time zone 'America/Bogota');
    raise exception 'Falla 5: el día cerrado aceptó una cita.';
  exception when raise_exception then
    if sqlerrm like 'Falla%' then raise; end if;
  end;
  set local role authenticated;
  delete from public.dias_habilitados where fecha = v_lunes;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Falla 5: no se quitó la excepción.'; end if;

  -- 6. Bloqueo de un profesional: sale en franjas_ocupadas y no se puede reservar dentro.
  insert into public.bloqueos (profesional_id, inicio, fin, motivo)
  values (v_prof, (v_lunes + time '14:00') at time zone 'America/Bogota',
    (v_lunes + time '16:00') at time zone 'America/Bogota', 'Prueba')
  returning id into v_bloqueo;
  select count(*) into v_n from public.franjas_ocupadas(v_prof,
    v_lunes::timestamp at time zone 'America/Bogota', (v_lunes + 1)::timestamp at time zone 'America/Bogota');
  if v_n < 1 then raise exception 'Falla 6: el bloqueo no sale en franjas_ocupadas.'; end if;
  reset role;
  -- Fuera del bloqueo, el lunes sí se reserva; dentro, no.
  perform public.validar_horario_cita(v_prof,
    (v_lunes + time '10:00') at time zone 'America/Bogota',
    (v_lunes + time '10:30') at time zone 'America/Bogota');
  begin
    perform public.validar_horario_cita(v_prof,
      (v_lunes + time '15:00') at time zone 'America/Bogota',
      (v_lunes + time '15:30') at time zone 'America/Bogota');
    raise exception 'Falla 6: se aceptó una cita dentro del bloqueo.';
  exception when raise_exception then
    if sqlerrm like 'Falla%' then raise; end if;
  end;

  -- 7. Un cliente no puede escribir en dias_habilitados ni en bloqueos (RLS).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.dias_habilitados (fecha) values (v_domingo + 7);
    raise exception 'Falla 7: un cliente habilitó un día.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.bloqueos (inicio, fin) values (now() + interval '1 day', now() + interval '25 hours');
    raise exception 'Falla 7: un cliente creó un bloqueo.';
  exception when insufficient_privilege then null;
  end;
  delete from public.bloqueos where id = v_bloqueo;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'Falla 7: un cliente quitó un bloqueo.'; end if;

  -- 8. El administrador quita el bloqueo.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  delete from public.bloqueos where id = v_bloqueo;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Falla 8: el administrador no quitó el bloqueo.'; end if;
  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
