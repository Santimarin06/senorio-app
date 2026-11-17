-- Comprobación de la gestión de profesionales (RF-29, D-13, D-46): guardar_profesional y la
-- lista de usuarios sin ficha. Corre entera dentro de una transacción que se deshace: no deja datos.
-- Uso: pegar en el editor SQL de Supabase (o execute_sql) después de aplicar la migración
-- 20261118000000_gestion_profesionales.sql. Si alguna regla falla, la consulta termina con el
-- error "Falla: ..."; si todo pasa, devuelve una fila con 'ok'.
-- Necesita un administrador, dos clientes, un servicio principal activo y uno adicional activo.

begin;

do $$
declare
  v_admin uuid;
  v_cliente uuid;
  v_otro uuid;
  v_principal uuid;
  v_adicional uuid;
  v_prof public.profesionales;
  v_n int;
begin
  select id into v_admin from public.perfiles where rol = 'administrador' limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' order by creado_en limit 1;
  select id into v_otro from public.perfiles where rol = 'cliente' and id <> v_cliente
    order by creado_en limit 1;
  select id into v_principal from public.servicios where activo and not es_adicional limit 1;
  select id into v_adicional from public.servicios where activo and es_adicional limit 1;
  if v_admin is null or v_otro is null or v_principal is null or v_adicional is null then
    raise exception 'Falla: hace falta un administrador, dos clientes, un servicio principal y un adicional.';
  end if;

  -- Como administrador (RLS de authenticated).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- El administrador ve a los clientes sin ficha (sin migración nueva).
  select count(*) into v_n from public.perfiles where rol = 'cliente' and profesional_id is null;
  if v_n < 2 then raise exception 'Falla: el administrador no ve a los clientes sin ficha.'; end if;

  -- Sin cuenta: una ficha nueva no se crea.
  begin
    perform public.guardar_profesional(null, 'Prueba', null, null, array[v_principal], null);
    raise exception 'Falla: creó una ficha sin cuenta.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;

  -- Solo adicionales: rechazado (D-02).
  begin
    perform public.guardar_profesional(null, 'Prueba', null, null, array[v_adicional], v_cliente);
    raise exception 'Falla: aceptó un profesional con solo adicionales.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;
  if exists (select 1 from public.perfiles where id = v_cliente and rol <> 'cliente') then
    raise exception 'Falla: un guardado rechazado cambió el rol.';
  end if;

  -- Crear: ficha, servicios y rol en una sola llamada.
  v_prof := public.guardar_profesional(null, '  Prueba RF-29 ', ' ', '', array[v_principal, v_adicional, v_principal],
                                       v_cliente);
  if v_prof.nombre <> 'Prueba RF-29' or v_prof.cargo is not null or v_prof.foto_url is not null then
    raise exception 'Falla: no recortó el nombre o no guardó cargo y foto vacíos como null.';
  end if;
  select count(*) into v_n from public.profesional_servicios where profesional_id = v_prof.id;
  if v_n <> 2 then raise exception 'Falla: esperaba 2 servicios y hay %.', v_n; end if;
  if not exists (select 1 from public.perfiles
                 where id = v_cliente and rol = 'profesional' and profesional_id = v_prof.id) then
    raise exception 'Falla: no asignó el rol profesional con la ficha.';
  end if;

  -- La misma cuenta ya no está disponible para otra ficha.
  begin
    perform public.guardar_profesional(null, 'Otra', null, null, array[v_principal], v_cliente);
    raise exception 'Falla: vinculó una cuenta que ya es profesional.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;

  -- Editar: reemplaza servicios; no se puede vincular otra cuenta a una ficha con cuenta.
  v_prof := public.guardar_profesional(v_prof.id, 'Prueba RF-29', 'Barbero', 'https://x/y.jpg',
                                       array[v_principal], null);
  select count(*) into v_n from public.profesional_servicios where profesional_id = v_prof.id;
  if v_n <> 1 or v_prof.cargo <> 'Barbero' or v_prof.foto_url <> 'https://x/y.jpg' then
    raise exception 'Falla: la edición no quedó como se pidió.';
  end if;
  begin
    perform public.guardar_profesional(v_prof.id, 'Prueba RF-29', null, null, array[v_principal], v_otro);
    raise exception 'Falla: reasignó la cuenta de una ficha.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;
  if (select cargo from public.profesionales where id = v_prof.id) <> 'Barbero'
     or exists (select 1 from public.perfiles where id = v_otro and rol <> 'cliente') then
    raise exception 'Falla: un guardado rechazado cambió la ficha o el rol.';
  end if;

  -- Desactivar: el administrador la sigue viendo; el cliente no.
  update public.profesionales set activo = false where id = v_prof.id;
  if not exists (select 1 from public.profesionales where id = v_prof.id) then
    raise exception 'Falla: el administrador no ve la ficha inactiva.';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_otro, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.profesionales where id = v_prof.id) then
    raise exception 'Falla: el cliente ve un profesional inactivo.';
  end if;
  if exists (select 1 from public.perfiles where id = v_cliente) then
    raise exception 'Falla: un cliente ve el perfil de otro usuario.';
  end if;
  begin
    perform public.guardar_profesional(null, 'Intruso', null, null, array[v_principal], v_otro);
    raise exception 'Falla: un cliente pudo crear un profesional.';
  exception when others then
    if sqlerrm like 'Falla:%' then raise; end if;
  end;

  reset role;
end;
$$;

select 'ok' as resultado;

rollback;
