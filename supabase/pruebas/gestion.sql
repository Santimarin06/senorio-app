-- Comprobación de la gestión del catálogo (RF-26, RF-27, D-43): guardar_servicio y el bucket fotos.
-- Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql) después de aplicar la migración
-- 20261117230000_gestion_catalogo.sql. Si alguna regla falla, la consulta termina con el error
-- "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita un administrador, un cliente y dos profesionales activos.

begin;

do $$
declare
  v_admin uuid;
  v_cliente uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_servicio public.servicios;
  v_n int;
begin
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' limit 1;
  select id into v_p1 from public.profesionales where activo order by nombre limit 1;
  select id into v_p2 from public.profesionales where activo and id <> v_p1 order by nombre limit 1;
  if v_admin is null or v_cliente is null or v_p2 is null then
    raise exception 'Falla: hace falta un administrador, un cliente y dos profesionales activos.';
  end if;

  if not exists (select 1 from storage.buckets where id = 'fotos' and public) then
    raise exception 'Falla: no existe el bucket público fotos.';
  end if;

  -- Como administrador (RLS de authenticated).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Crear con los dos profesionales.
  v_servicio := public.guardar_servicio(null, '  Prueba gestión ', ' ', 30, 15000, false,
                                        array[v_p1, v_p2, v_p1]);
  if v_servicio.nombre <> 'Prueba gestión' or v_servicio.descripcion is not null then
    raise exception 'Falla: no recortó el nombre o no guardó la descripción vacía como null.';
  end if;
  select count(*) into v_n from public.profesional_servicios where servicio_id = v_servicio.id;
  if v_n <> 2 then raise exception 'Falla: esperaba 2 profesionales y hay %.', v_n; end if;

  -- Editar dejando solo uno: se reemplaza la lista completa.
  v_servicio := public.guardar_servicio(v_servicio.id, 'Prueba gestión', 'Con lavado', 45, 0, true,
                                        array[v_p2]);
  select count(*) into v_n from public.profesional_servicios where servicio_id = v_servicio.id;
  if v_n <> 1 or v_servicio.duracion_min <> 45 or v_servicio.precio <> 0 or not v_servicio.es_adicional then
    raise exception 'Falla: la edición no quedó como se pidió.';
  end if;

  -- Sin profesionales: falla y no cambia nada (atómico).
  begin
    perform public.guardar_servicio(v_servicio.id, 'Otro nombre', null, 45, 0, true, '{}');
    raise exception 'Falla: aceptó un servicio sin profesionales.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;
  if (select nombre from public.servicios where id = v_servicio.id) <> 'Prueba gestión' then
    raise exception 'Falla: un guardado rechazado cambió el servicio.';
  end if;

  -- Duración 0 y precio negativo.
  begin
    perform public.guardar_servicio(null, 'X', null, 0, 1000, false, array[v_p1]);
    raise exception 'Falla: aceptó duración 0.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;
  begin
    perform public.guardar_servicio(null, 'X', null, 10, -1, false, array[v_p1]);
    raise exception 'Falla: aceptó precio negativo.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;

  -- Desactivar: el administrador lo sigue viendo; el cliente no.
  update public.servicios set activo = false where id = v_servicio.id;
  if not exists (select 1 from public.servicios where id = v_servicio.id) then
    raise exception 'Falla: el administrador no ve el servicio inactivo.';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.servicios where id = v_servicio.id) then
    raise exception 'Falla: el cliente ve un servicio inactivo.';
  end if;
  begin
    perform public.guardar_servicio(null, 'Intruso', null, 10, 1000, false, array[v_p1]);
    raise exception 'Falla: un cliente pudo guardar un servicio.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;

  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
