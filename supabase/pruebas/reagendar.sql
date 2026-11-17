-- Comprobación de reagendar_cita, elegir_devolucion y registrar_devolucion (RF-14, RF-28,
-- RN-07, RN-15, RN-16, D-05, D-26, D-27, D-45).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql) después de aplicar la migración
-- 20261117235000_reagendar_cita.sql. Si alguna regla falla, la consulta termina con el error
-- "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita un cliente sin multa pendiente, un profesional activo y un administrador. Usa el
-- martes 1 de diciembre de 2026 por la tarde (hora de Bogotá).

begin;

do $$
declare
  v_cliente uuid;
  v_admin uuid;
  v_prof uuid;
  v_dia date := '2026-12-01';
  v_a uuid;      -- futura con anticipo aprobado de $20.000
  v_ocupa uuid;  -- ocupa la franja de las 4:00 p. m.
  v_z uuid;      -- futura que intenta pasar a una franja ocupada
  v_b uuid;      -- no asistida con anticipo de $15.000 (reagenda)
  v_d uuid;      -- no asistida con anticipo de $15.000 (elige devolución)
  v_v uuid;      -- no asistida sin anticipo (multa pendiente)
  r jsonb;
  v_nueva uuid;
  v_n integer;
  -- Instante de v_dia a la hora de Bogotá dada.
  h constant text := ' America/Bogota';
begin
  select p.id into v_cliente from public.perfiles p
  where p.rol = 'cliente' and not public.tiene_multa_pendiente(p.id) limit 1;
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_prof from public.profesionales where activo limit 1;
  if v_cliente is null or v_prof is null or v_admin is null then
    raise exception 'Falla: hace falta un cliente sin multa, un profesional activo y un administrador.';
  end if;

  -- Citas de prueba insertadas como postgres (sin pasar por reservar_cita).
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, (v_dia || ' 15:00' || h)::timestamptz, (v_dia || ' 15:30' || h)::timestamptz, 35000)
  returning id into v_a;
  insert into public.cita_servicios (cita_id, servicio_id, nombre, duracion_min, precio)
  select v_a, id, nombre, 30, 35000 from public.servicios limit 1;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, (v_dia || ' 16:00' || h)::timestamptz, (v_dia || ' 16:30' || h)::timestamptz, 30000)
  returning id into v_ocupa;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, (v_dia || ' 17:00' || h)::timestamptz, (v_dia || ' 17:30' || h)::timestamptz, 30000)
  returning id into v_z;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '1 day', now() + interval '1 day 30 minutes', 35000)
  returning id into v_b;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '2 days', now() + interval '2 days 30 minutes', 35000)
  returning id into v_d;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '3 days', now() + interval '3 days 30 minutes', 35000)
  returning id into v_v;

  -- Anticipos como el cliente; los aprueba el administrador.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_a, 'abono', 20000, v_cliente || '/a.jpg'),
         (v_b, 'abono', 15000, v_cliente || '/b.jpg'),
         (v_d, 'abono', 15000, v_cliente || '/d.jpg');
  update public.comprobantes set estado = 'aprobado' where cita_id in (v_a, v_b, v_d);

  -- v_b y v_d pasan a ayer y quedan no asistidas: la multa nace cobrada del anticipo.
  -- Horas distintas: son del mismo profesional y no pueden solaparse (RN-02).
  update public.citas
  set inicio = now() - interval '1 day', fin = now() - interval '1 day' + interval '30 minutes',
      estado = 'no_asistida'
  where id = v_b;
  update public.citas
  set inicio = now() - interval '1 day 1 hour', fin = now() - interval '1 day 30 minutes',
      estado = 'no_asistida'
  where id = v_d;
  if exists (select 1 from public.multas where cita_id in (v_b, v_d) and estado <> 'cobrada_anticipo') then
    raise exception 'Falla: la multa con anticipo de $15.000 no quedó cobrada.';
  end if;

  set local role authenticated;

  -- 1. Futura (Caso A): se puede mover 15 min aunque se solape con ella misma; pasa todo.
  r := public.reagendar_cita(v_a, (v_dia || ' 15:15' || h)::timestamptz);
  v_nueva := (r ->> 'cita_id')::uuid;
  if r ->> 'caso' <> 'futura' or (r ->> 'anticipo_trasladado')::int <> 20000
     or (r ->> 'diferencia')::int <> 0 then
    raise exception 'Falla 1: %', r;
  end if;
  if (select estado from public.citas where id = v_a) <> 'reagendada'
     or (select reagendada_desde from public.citas where id = v_nueva) <> v_a
     or (select count(*) from public.cita_servicios where cita_id = v_nueva) <> 1
     or (select total from public.citas where id = v_nueva) <> 35000 then
    raise exception 'Falla 1: la original o la nueva no quedaron bien.';
  end if;
  select count(*) into v_n from public.comprobantes
  where cita_id = v_nueva and estado = 'aprobado' and monto = 20000 and trasladado_desde is not null;
  if v_n <> 1 then raise exception 'Falla 1: el anticipo no pasó a la nueva cita.'; end if;

  -- 2. Idempotente: repetir devuelve la misma cita nueva.
  if public.reagendar_cita(v_a, (v_dia || ' 18:00' || h)::timestamptz) ->> 'cita_id' <> v_nueva::text then
    raise exception 'Falla 2: repetir creó otra cita.';
  end if;

  -- 3. Con traslado de $20.000 en una cita de $35.000 se puede pagar el resto.
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
    values (v_nueva, 'abono', 15001, v_cliente || '/extra.jpg');
    raise exception 'Falla 3: aceptó pagar más de lo que falta.';
  exception when others then
    if sqlerrm not like 'RN-08:%' then raise; end if;
  end;

  -- 4. Franja ocupada: error RN-02 y la cita sigue igual.
  begin
    perform public.reagendar_cita(v_z, (v_dia || ' 16:00' || h)::timestamptz);
    raise exception 'Falla 4: reagendó sobre una franja ocupada.';
  exception when others then
    if sqlerrm <> 'RN-02: esa franja acaba de ocuparse. Elige otra.' then raise; end if;
  end;
  if (select estado from public.citas where id = v_z) <> 'confirmada'
     or exists (select 1 from public.citas where reagendada_desde = v_z) then
    raise exception 'Falla 4: la cita cambió aunque la franja chocó.';
  end if;

  -- 5. No asistida (Caso B) con $15.000: pasan $5.000 y faltan $5.000.
  r := public.reagendar_cita(v_b, (v_dia || ' 18:00' || h)::timestamptz);
  v_nueva := (r ->> 'cita_id')::uuid;
  if r ->> 'caso' <> 'no_asistida' or (r ->> 'anticipo_trasladado')::int <> 5000
     or (r ->> 'diferencia')::int <> 5000 then
    raise exception 'Falla 5: %', r;
  end if;
  -- La diferencia: menos de $5.000 no, $5.000 sí (cabe junto al traslado).
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
    values (v_nueva, 'abono', 4000, v_cliente || '/dif.jpg');
    raise exception 'Falla 5: aceptó una diferencia menor que $5.000.';
  exception when others then
    if sqlerrm not like 'RN-08:%' then raise; end if;
  end;
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_nueva, 'abono', 5000, v_cliente || '/dif.jpg');

  -- 6. Elegir devolución: $15.000 − $10.000 − $2.000 = $3.000; luego no se reagenda.
  r := public.elegir_devolucion(v_d);
  if (r ->> 'devolucion')::int <> 3000 or r ->> 'devolucion_elegida_en' is null then
    raise exception 'Falla 6: %', r;
  end if;
  if public.elegir_devolucion(v_d) ->> 'devolucion_elegida_en' <> r ->> 'devolucion_elegida_en' then
    raise exception 'Falla 6: elegir dos veces cambió la fecha.';
  end if;
  begin
    perform public.reagendar_cita(v_d, (v_dia || ' 18:30' || h)::timestamptz);
    raise exception 'Falla 6: reagendó después de elegir devolución.';
  exception when others then
    if sqlerrm not like 'RN-16:%' then raise; end if;
  end;

  -- 7. El cliente no registra devoluciones; el administrador sí, repartidas.
  begin
    perform public.registrar_devolucion(v_d, 3000);
    raise exception 'Falla 7: el cliente registró una devolución.';
  exception when others then
    if sqlerrm <> 'Solo el administrador registra devoluciones.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.registrar_devolucion(v_d, 3000);
  if (select devolucion_monto from public.comprobantes where cita_id = v_d and estado = 'aprobado') <> 3000 then
    raise exception 'Falla 7: no quedó registrada la devolución.';
  end if;
  -- Aprobar la diferencia de la cita nueva del caso B: el anticipo llega a $10.000.
  update public.comprobantes set estado = 'aprobado'
  where cita_id = v_nueva and trasladado_desde is null;
  if (select sum(monto) from public.comprobantes where cita_id = v_nueva and estado = 'aprobado') <> 10000 then
    raise exception 'Falla 7: el anticipo de la cita nueva no suma $10.000.';
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);

  -- 8. Sin anticipo y con la multa pendiente no se reagenda (D-26).
  reset role;
  update public.citas
  set inicio = now() - interval '1 day 2 hours', fin = now() - interval '1 day 1 hour 30 minutes',
      estado = 'no_asistida'
  where id = v_v;
  set local role authenticated;
  begin
    perform public.reagendar_cita(v_v, (v_dia || ' 19:00' || h)::timestamptz);
    raise exception 'Falla 8: reagendó con la multa pendiente.';
  exception when others then
    if sqlerrm not like 'RN-07:%' then raise; end if;
  end;

  -- 9. Otro usuario no encuentra la cita.
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform public.reagendar_cita(v_z, (v_dia || ' 19:00' || h)::timestamptz);
    raise exception 'Falla 9: otro usuario reagendó la cita.';
  exception when others then
    if sqlerrm <> 'No encontramos esta cita.' then raise; end if;
  end;
  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
