-- Comprobación de los comprobantes del anticipo (RF-13, RN-07, RN-08, RN-09, D-38).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql). Si alguna regla falla, la
-- consulta termina con el error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita al menos un perfil con rol cliente sin multa pendiente y un profesional.

begin;

do $$
declare
  v_cliente uuid;
  v_prof uuid;
  v_cita uuid;        -- empieza en 1 día, total $30.000
  v_comp uuid;
  r public.comprobantes%rowtype;
begin
  select p.id into v_cliente
  from public.perfiles p
  where p.rol = 'cliente' and not public.tiene_multa_pendiente(p.id)
  limit 1;
  select id into v_prof from public.profesionales limit 1;
  if v_cliente is null or v_prof is null then
    raise exception 'Falla: hace falta un cliente sin multa y un profesional.';
  end if;

  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '1 day', now() + interval '1 day 30 minutes', 30000)
  returning id into v_cita;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Abono menor a $10.000 (RN-08).
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
    values (v_cita, 'abono', 5000, v_cliente || '/a.jpg', 'nequi');
    raise exception 'Falla 1: se aceptó un abono de $5.000.';
  exception when others then
    if sqlerrm not like 'RN-08:%' then raise; end if;
  end;

  -- 2. Pago total distinto del total de la cita.
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
    values (v_cita, 'total', 20000, v_cliente || '/a.jpg', 'nequi');
    raise exception 'Falla 2: se aceptó un total distinto del valor de la cita.';
  exception when others then
    if sqlerrm not like 'RN-08:%' then raise; end if;
  end;

  -- 3. Archivo fuera de la carpeta del cliente.
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
    values (v_cita, 'abono', 20000, gen_random_uuid() || '/a.jpg', 'nequi');
    raise exception 'Falla 3: se aceptó un archivo de otra carpeta.';
  exception when others then
    if sqlerrm not like 'RF-13:%' then raise; end if;
  end;

  -- 4. Abono válido: nace pendiente y no cuenta como pagado (RN-09).
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
  values (v_cita, 'abono', 20000, v_cliente || '/a.jpg', 'nequi')
  returning id into v_comp;
  select * into r from public.comprobantes where id = v_comp;
  if r.estado <> 'pendiente' or r.metodo <> 'nequi' then
    raise exception 'Falla 4: %', row_to_json(r);
  end if;

  -- 5. Un segundo comprobante vigente choca con el índice (23505).
  begin
    insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
    values (v_cita, 'abono', 15000, v_cliente || '/b.jpg', 'bold');
    raise exception 'Falla 5: se aceptó un segundo comprobante vigente.';
  exception when unique_violation then null;
  end;

  -- 6. Reemplazar la imagen del pendiente: misma fila, archivo nuevo.
  r := public.reemplazar_comprobante(v_comp, v_cliente || '/c.jpg');
  if r.id <> v_comp or r.archivo_path <> v_cliente || '/c.jpg' or r.estado <> 'pendiente' then
    raise exception 'Falla 6: %', row_to_json(r);
  end if;

  -- 7. Otro usuario no lo reemplaza.
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform public.reemplazar_comprobante(v_comp, v_cliente || '/d.jpg');
    raise exception 'Falla 7: otro usuario reemplazó el comprobante.';
  exception when others then
    if sqlerrm <> 'No encontramos este comprobante.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);

  -- 8. Uno aprobado ya no se reemplaza.
  reset role;
  update public.comprobantes set estado = 'aprobado' where id = v_comp;
  set local role authenticated;
  begin
    perform public.reemplazar_comprobante(v_comp, v_cliente || '/e.jpg');
    raise exception 'Falla 8: se reemplazó un comprobante aprobado.';
  exception when others then
    if sqlerrm not like 'RF-13:%' then raise; end if;
  end;

  -- 9. Uno rechazado deja enviar otro (el índice lo permite).
  reset role;
  update public.comprobantes set estado = 'rechazado', nota_rechazo = 'Ilegible' where id = v_comp;
  set local role authenticated;
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path, metodo)
  values (v_cita, 'total', 30000, v_cliente || '/f.png', 'bancolombia');
  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
