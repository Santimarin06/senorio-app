-- Comprobación de la asistencia y la multa (RF-21, RF-23, RN-06, D-08, D-28, D-39).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql). Si alguna regla falla, la
-- consulta termina con el error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita un cliente sin multa pendiente y dos perfiles con rol profesional.

begin;

do $$
declare
  v_cliente uuid;
  v_usuario_prof uuid;  -- perfil (auth) del profesional
  v_prof uuid;          -- su ficha en profesionales
  v_otro_prof uuid;
  v_con uuid;      -- hace 3 días, con anticipo aprobado
  v_sin uuid;      -- hace 3 días, sin anticipo
  v_reciente uuid; -- empezó hace 5 minutos
  v_futura uuid;   -- empieza en 2 horas
  v_ajena uuid;    -- de otro profesional, hace 3 días
  v_n int;
  v_estado text;
  v_ok boolean;
begin
  select p.id into v_cliente from public.perfiles p
  where p.rol = 'cliente' and not public.tiene_multa_pendiente(p.id) limit 1;
  select id, profesional_id into v_usuario_prof, v_prof from public.perfiles
  where rol = 'profesional' order by id limit 1;
  select profesional_id into v_otro_prof from public.perfiles
  where rol = 'profesional' and profesional_id <> v_prof limit 1;
  if v_cliente is null or v_prof is null or v_otro_prof is null then
    raise exception 'Falla: hace falta un cliente sin multa y dos profesionales con perfil.';
  end if;

  -- Citas insertadas como postgres. La de anticipo nace futura para poder subir el
  -- comprobante (preparar_comprobante lo exige) y después se corre al pasado.
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '5 days', now() + interval '5 days 30 minutes', 30000)
  returning id into v_con;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() - interval '3 days' + interval '1 hour',
          now() - interval '3 days' + interval '90 minutes', 30000)
  returning id into v_sin;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() - interval '5 minutes', now() + interval '25 minutes', 30000)
  returning id into v_reciente;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '2 hours', now() + interval '150 minutes', 30000)
  returning id into v_futura;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_otro_prof, now() - interval '3 days', now() - interval '3 days' + interval '30 minutes', 30000)
  returning id into v_ajena;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_con, 'abono', 20000, v_cliente || '/prueba.jpg');
  update public.comprobantes set estado = 'aprobado' where cita_id = v_con;
  -- Un comprobante pendiente en la cita sin anticipo: no cuenta (RN-09) ni lo ve el profesional.
  update public.citas set inicio = now() + interval '6 days', fin = now() + interval '6 days 30 minutes'
  where id = v_sin;
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_sin, 'abono', 15000, v_cliente || '/prueba2.jpg');
  update public.citas set inicio = now() - interval '3 days' + interval '1 hour',
    fin = now() - interval '3 days' + interval '90 minutes' where id = v_sin;
  update public.citas set inicio = now() - interval '3 days', fin = now() - interval '3 days' + interval '30 minutes'
  where id = v_con;

  -- Desde aquí, como la app del profesional.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario_prof, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. RF-21: ve sus citas con el nombre del cliente y no las de otro profesional.
  select count(*) into v_n from public.citas c
  join public.perfiles p on p.id = c.cliente_id
  where c.id in (v_con, v_sin, v_reciente, v_futura, v_ajena);
  if v_n <> 4 then raise exception 'Falla 1: ve % citas con cliente (esperaba 4).', v_n; end if;

  -- 2. Ve el anticipo aprobado de su cita, pero no el comprobante pendiente.
  select count(*) into v_n from public.comprobantes where cita_id = v_con and estado = 'aprobado';
  if v_n <> 1 then raise exception 'Falla 2: no ve el anticipo aprobado.'; end if;
  select count(*) into v_n from public.comprobantes where cita_id = v_sin;
  if v_n <> 0 then raise exception 'Falla 2b: ve un comprobante pendiente.'; end if;

  -- 3. Una cita futura no se marca (RF-23).
  v_ok := false;
  begin
    update public.citas set estado = 'asistida' where id = v_futura;
  exception when raise_exception then v_ok := sqlerrm like 'RF-23:%';
  end;
  if not v_ok then raise exception 'Falla 3: marcó una cita futura.'; end if;

  -- 4. D-08: "No asistió" antes de la tolerancia se rechaza; "Asistió" sí se guarda.
  v_ok := false;
  begin
    update public.citas set estado = 'no_asistida' where id = v_reciente;
  exception when raise_exception then v_ok := sqlerrm like 'D-08:%';
  end;
  if not v_ok then raise exception 'Falla 4: marcó no asistida dentro de la tolerancia.'; end if;
  update public.citas set estado = 'asistida' where id = v_reciente;
  select estado into v_estado from public.citas where id = v_reciente;
  if v_estado <> 'asistida' then raise exception 'Falla 4b: estado %', v_estado; end if;

  -- 5. La cita de otro profesional no se actualiza (la RLS la oculta: 0 filas).
  update public.citas set estado = 'asistida' where id = v_ajena;
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'Falla 5: marcó una cita ajena.'; end if;

  -- 6. No asistida con anticipo aprobado: multa cobrada del anticipo (D-28).
  update public.citas set estado = 'no_asistida' where id = v_con;
  -- 7. No asistida sin anticipo aprobado: multa pendiente (RN-06, RN-07).
  update public.citas set estado = 'no_asistida' where id = v_sin;

  reset role;
  select estado into v_estado from public.multas where cita_id = v_con;
  if v_estado is distinct from 'cobrada_anticipo' then
    raise exception 'Falla 6: multa con anticipo en estado %', v_estado;
  end if;
  select estado into v_estado from public.multas where cita_id = v_sin;
  if v_estado is distinct from 'pendiente' then
    raise exception 'Falla 7: multa sin anticipo en estado %', v_estado;
  end if;
  select count(*) into v_n from public.multas where cita_id = v_reciente;
  if v_n <> 0 then raise exception 'Falla 8: la cita asistida generó multa.'; end if;
end;
$$;

select 'ok' as resultado;

rollback;
