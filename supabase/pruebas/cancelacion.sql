-- Comprobación de cancelar_cita y generar_multa (RF-09, RN-06, RN-07, D-28, D-37).
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql). Si alguna regla falla, la
-- consulta termina con el error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita al menos un perfil con rol cliente sin multa pendiente y un profesional.

begin;

do $$
declare
  v_cliente uuid;
  v_prof uuid;
  v_tarde_con uuid;   -- empieza en 2 h, con anticipo aprobado de $20.000
  v_tarde_sin uuid;   -- empieza en 3 h, sin anticipo
  v_a_tiempo uuid;    -- empieza en 6 h
  r jsonb;
  r2 jsonb;
begin
  select p.id into v_cliente
  from public.perfiles p
  where p.rol = 'cliente' and not public.tiene_multa_pendiente(p.id)
  limit 1;
  select id into v_prof from public.profesionales limit 1;
  if v_cliente is null or v_prof is null then
    raise exception 'Falla: hace falta un cliente sin multa y un profesional.';
  end if;

  -- Citas de prueba insertadas como postgres (sin pasar por reservar_cita).
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '2 hours', now() + interval '2 hours 30 minutes', 30000)
  returning id into v_tarde_con;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '3 hours', now() + interval '3 hours 30 minutes', 30000)
  returning id into v_tarde_sin;
  insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
  values (v_cliente, v_prof, now() + interval '6 hours', now() + interval '6 hours 30 minutes', 30000)
  returning id into v_a_tiempo;

  -- Sesión simulada del cliente: auth.uid() lee el "sub" de estos claims.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
  values (v_tarde_con, 'abono', 20000, v_cliente || '/prueba.jpg');
  update public.comprobantes set estado = 'aprobado' where cita_id = v_tarde_con;

  -- Desde aquí, como la app: rol authenticated.
  set local role authenticated;

  -- 1. Tardía con anticipo: la multa nace cobrada del anticipo (D-28).
  r := public.cancelar_cita(v_tarde_con);
  if r ->> 'estado' <> 'cancelada_tarde'
     or r ->> 'multa_estado' <> 'cobrada_anticipo'
     or (r ->> 'anticipo_aprobado')::int <> 20000 then
    raise exception 'Falla 1: %', r;
  end if;

  -- 2. A tiempo: sin multa.
  r := public.cancelar_cita(v_a_tiempo);
  if r ->> 'estado' <> 'cancelada_a_tiempo' or r -> 'multa_estado' <> 'null'::jsonb then
    raise exception 'Falla 2: %', r;
  end if;

  -- 3. Idempotente: repetir devuelve lo mismo y no crea otra multa.
  r2 := public.cancelar_cita(v_tarde_con);
  if r2 is distinct from public.cancelar_cita(v_tarde_con) or r2 ->> 'estado' <> 'cancelada_tarde' then
    raise exception 'Falla 3: %', r2;
  end if;

  -- 4. Otro usuario no la encuentra.
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform public.cancelar_cita(v_tarde_sin);
    raise exception 'Falla 4: otro usuario canceló la cita.';
  exception when others then
    if sqlerrm <> 'No encontramos esta cita.' then raise; end if;
  end;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);

  -- 5. Hasta aquí el anticipo cubrió la multa: el cliente no queda bloqueado.
  reset role;
  if public.tiene_multa_pendiente(v_cliente) then
    raise exception 'Falla 5: la multa cubierta por el anticipo bloquea al cliente.';
  end if;
  set local role authenticated;

  -- 6. Tardía sin anticipo: multa pendiente y bloqueo (RN-07).
  r := public.cancelar_cita(v_tarde_sin);
  if r ->> 'estado' <> 'cancelada_tarde' or r ->> 'multa_estado' <> 'pendiente' then
    raise exception 'Falla 6: %', r;
  end if;
  reset role;
  if not public.tiene_multa_pendiente(v_cliente) then
    raise exception 'Falla 6: la multa sin anticipo no quedó pendiente.';
  end if;

  -- 7. Una cita ya cancelada no pasa a otro estado; una que ya empezó no se cancela.
  update public.citas set inicio = now() - interval '1 hour', fin = now(), estado = 'confirmada'
  where id = v_a_tiempo;
  set local role authenticated;
  begin
    perform public.cancelar_cita(v_a_tiempo);
    raise exception 'Falla 7: se canceló una cita que ya empezó.';
  exception when others then
    if sqlerrm <> 'RF-09: esta cita ya no se puede cancelar.' then raise; end if;
  end;
  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
