-- Gestión de profesionales por el administrador (RF-29, D-13, D-46).
--
-- Listar a los usuarios que aún no tienen ficha NO necesita cambios: la política
-- "Ver perfiles permitidos" (20261115120000) ya deja al administrador leer todos los perfiles.
--
-- guardar_profesional crea o edita la ficha, reemplaza sus servicios y, si se indica, vincula la
-- cuenta de un cliente con asignar_rol, todo en una sola transacción. Por HTTP serían hasta
-- cuatro peticiones (ficha, borrar servicios, insertar servicios, asignar_rol) y un fallo a mitad
-- dejaría una ficha visible sin servicios o sin cuenta. Activar y desactivar va directo a la
-- tabla: la RLS "Administrador gestiona profesionales" ya solo se lo permite al administrador.
-- La foto usa el bucket público "fotos" (20261117230000), cuyas políticas ya son solo del
-- administrador para cualquier carpeta.

create function public.guardar_profesional(
  p_id uuid,
  p_nombre text,
  p_cargo text,
  p_foto_url text,
  p_servicios uuid[],
  p_usuario uuid
) returns public.profesionales
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profesional public.profesionales;
  v_servicios uuid[];
begin
  if not public.es_admin() then
    raise exception 'RF-29: solo el administrador gestiona los profesionales.' using errcode = '42501';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'RF-29: el nombre es obligatorio.';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_servicios
  from unnest(coalesce(p_servicios, '{}')) as x;

  -- RN-04 y D-02: con solo adicionales no se puede reservar con este profesional.
  if not exists (
    select 1 from public.servicios
    where id = any (v_servicios) and activo and not es_adicional
  ) then
    raise exception 'RF-29: elige al menos un servicio principal activo.';
  end if;
  if (select count(*) from public.servicios where id = any (v_servicios))
     <> cardinality(v_servicios) then
    raise exception 'RF-29: uno de los servicios ya no existe.';
  end if;

  -- D-13: la ficha nueva siempre se vincula a la cuenta de alguien que se registró como cliente.
  if p_id is null and p_usuario is null then
    raise exception 'RF-29: elige la cuenta de la persona.';
  end if;
  if p_usuario is not null and not exists (
    select 1 from public.perfiles where id = p_usuario and rol = 'cliente'
  ) then
    raise exception 'RF-29: esa cuenta ya no está disponible; elige otra.';
  end if;

  if p_id is null then
    insert into public.profesionales (nombre, cargo, foto_url)
    values (trim(p_nombre), nullif(trim(coalesce(p_cargo, '')), ''), nullif(p_foto_url, ''))
    returning * into v_profesional;
  else
    update public.profesionales
    set nombre = trim(p_nombre),
        cargo = nullif(trim(coalesce(p_cargo, '')), ''),
        foto_url = nullif(p_foto_url, '')
    where id = p_id
    returning * into v_profesional;
    if not found then
      raise exception 'RF-29: no encontramos este profesional.';
    end if;
    -- Una ficha que ya tiene cuenta no se reasigna desde aquí.
    if p_usuario is not null
       and exists (select 1 from public.perfiles where profesional_id = p_id) then
      raise exception 'RF-29: este profesional ya tiene una cuenta vinculada.';
    end if;
  end if;

  -- Reemplaza la lista completa: quita lo que ya no presta y agrega lo nuevo.
  delete from public.profesional_servicios
  where profesional_id = v_profesional.id and servicio_id <> all (v_servicios);
  insert into public.profesional_servicios (profesional_id, servicio_id)
  select v_profesional.id, x from unnest(v_servicios) as x
  on conflict do nothing;

  if p_usuario is not null then
    perform public.asignar_rol(p_usuario, 'profesional', v_profesional.id);
  end if;

  return v_profesional;
end;
$$;

revoke execute on function public.guardar_profesional(uuid, text, text, text, uuid[], uuid)
  from public, anon;
grant execute on function public.guardar_profesional(uuid, text, text, text, uuid[], uuid)
  to authenticated;
