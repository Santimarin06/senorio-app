-- Comprobación de la revisión del administrador (RF-25, RF-28, RN-07, RN-09, D-28, D-37, D-42).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql). Si alguna regla falla, la
-- consulta termina con el error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita un cliente sin multa pendiente, un profesional y un administrador.

begin;

do $$
declare
  v_cliente uuid;
  v_admin uuid;
  v_prof uuid;
  v_tarde uuid;     -- cancelada tarde con el comprobante aún pendiente (D-37)
  v_sin uuid;       -- no asistida sin anticipo
  v_rechazo uuid;   -- comprobante que se rechaza
  v_comp uuid;
  v_n int;
  v_estado text;
  v_por uuid;
  v_en timestamptz;
begin
  select p.id into v_cliente from public.perfiles p
  where p.rol = 'cliente' and not public.tiene_multa_pendiente(p.id) limit 1;
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_prof from public.profesionales where activo limit 1;
  if v_cliente is null or v_admin is null or v_prof is null then
    raise exception 'Falla: hace falta un cliente sin multa, un administrador y un profesional.';
  end if;

  -- Citas futuras (como postgres) para que el cliente pueda subir comprobantes.
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '7 days', now() + interval '7 days 30 minutes', 30000)
  returning id into v_tarde;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '8 days', now() + interval '8 days 30 minutes', 30000)
  returning id into v_sin;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '9 days', now() + interval '9 days 30 minutes', 30000)
  returning id into v_rechazo;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_tarde, 'abono', 20000, v_cliente || '/prueba-revision.jpg')
  returning id into v_comp;
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_rechazo, 'abono', 15000, v_cliente || '/prueba-rechazo.jpg');

  -- Como postgres: la primera se cancela tarde (multa pendiente: el comprobante no está
  -- aprobado) y la segunda queda no asistida sin anticipo.
  update public.citas set estado = 'cancelada_tarde' where id = v_tarde;
  update public.citas set estado = 'no_asistida' where id = v_sin;
  select estado into v_estado from public.multas where cita_id = v_tarde;
  if v_estado is distinct from 'pendiente' then
    raise exception 'Falla 0: la multa con comprobante pendiente nació % (esperaba pendiente).', v_estado;
  end if;

  -- 1. El cliente no puede resolver su propia multa (RLS: 0 filas).
  set local role authenticated;
  update public.multas set estado = 'perdonada' where cita_id = v_sin;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'Falla 1: el cliente resolvió su multa.'; end if;
  reset role;

  -- Desde aquí, como la app del administrador.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 2. Ve los comprobantes pendientes del cliente con su perfil.
  select count(*) into v_n from public.comprobantes c
  join public.perfiles p on p.id = c.cliente_id
  where c.cita_id in (v_tarde, v_rechazo) and c.estado = 'pendiente';
  if v_n <> 2 then raise exception 'Falla 2: ve % comprobantes pendientes (esperaba 2).', v_n; end if;

  -- 3. D-37: al aprobar, la multa pendiente de esa cita pasa a cobrada_anticipo (D-28).
  update public.comprobantes set estado = 'aprobado' where id = v_comp and estado = 'pendiente';
  select estado, resuelta_por, resuelta_en into v_estado, v_por, v_en
  from public.multas where cita_id = v_tarde;
  if v_estado <> 'cobrada_anticipo' or v_por is distinct from v_admin or v_en is null then
    raise exception 'Falla 3: la multa quedó % (por %, en %).', v_estado, v_por, v_en;
  end if;
  select revisado_por into v_por from public.comprobantes where id = v_comp;
  if v_por is distinct from v_admin then raise exception 'Falla 3b: no quedó quién revisó.'; end if;

  -- 4. RF-28: registrar la devolución fija devuelto_en; un segundo registro no cambia nada.
  update public.comprobantes set devolucion_monto = 8000
  where id = v_comp and estado = 'aprobado' and devolucion_monto is null;
  select devuelto_en into v_en from public.comprobantes where id = v_comp;
  if v_en is null then raise exception 'Falla 4: no se fijó devuelto_en.'; end if;
  update public.comprobantes set devolucion_monto = 5000
  where id = v_comp and estado = 'aprobado' and devolucion_monto is null;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'Falla 4b: se registró dos veces la devolución.'; end if;

  -- 5. Rechazar guarda el motivo.
  update public.comprobantes set estado = 'rechazado', nota_rechazo = 'No llegó el ingreso'
  where cita_id = v_rechazo and estado = 'pendiente';
  select count(*) into v_n from public.comprobantes
  where cita_id = v_rechazo and estado = 'rechazado' and nota_rechazo = 'No llegó el ingreso'
    and revisado_en is not null;
  if v_n <> 1 then raise exception 'Falla 5: el rechazo no quedó con su motivo.'; end if;

  -- 6. RN-07: perdonar la multa desbloquea al cliente.
  update public.multas set estado = 'perdonada' where cita_id = v_sin and estado = 'pendiente';
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Falla 6: no se perdonó la multa.'; end if;
  reset role;
  if public.tiene_multa_pendiente(v_cliente) then
    raise exception 'Falla 6b: el cliente sigue con multa pendiente.';
  end if;
end;
$$;

select 'ok' as resultado;

rollback;
