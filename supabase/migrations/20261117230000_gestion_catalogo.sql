-- Gestión del catálogo por el administrador (RF-26, RF-27, D-43).
-- 1) guardar_servicio: crea o edita un servicio y reemplaza sus profesionales en una sola
--    transacción. Por HTTP serían tres peticiones (servicio, borrar relaciones, insertar
--    relaciones) y un fallo a mitad dejaría el servicio sin profesionales.
-- 2) Bucket público "fotos" para las fotos de productos: cualquiera las ve por su URL pública;
--    solo el administrador sube, reemplaza o borra.
-- Activar y desactivar, y crear o editar productos, van directo a las tablas: la RLS
-- "Administrador gestiona …" (20261115120000) ya solo se lo permite al administrador.

create function public.guardar_servicio(
  p_id uuid,
  p_nombre text,
  p_descripcion text,
  p_duracion_min integer,
  p_precio integer,
  p_es_adicional boolean,
  p_profesionales uuid[]
) returns public.servicios
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_servicio public.servicios;
  v_profesionales uuid[];
begin
  if not public.es_admin() then
    raise exception 'RF-26: solo el administrador gestiona los servicios.' using errcode = '42501';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'RF-26: el nombre es obligatorio.';
  end if;
  if p_duracion_min is null or p_duracion_min <= 0 then
    raise exception 'RF-26: la duración debe ser un número entero de minutos mayor que 0.';
  end if;
  if p_precio is null or p_precio < 0 then
    raise exception 'RF-26: el precio debe ser un número entero mayor o igual a 0.';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_profesionales
  from unnest(coalesce(p_profesionales, '{}')) as x;

  -- RN-04: alguien activo debe poder prestarlo.
  if not exists (
    select 1 from public.profesionales
    where id = any (v_profesionales) and activo
  ) then
    raise exception 'RF-26: elige al menos un profesional activo.';
  end if;
  if (select count(*) from public.profesionales where id = any (v_profesionales))
     <> cardinality(v_profesionales) then
    raise exception 'RF-26: uno de los profesionales ya no existe.';
  end if;

  if p_id is null then
    insert into public.servicios (nombre, descripcion, duracion_min, precio, es_adicional)
    values (trim(p_nombre), nullif(trim(coalesce(p_descripcion, '')), ''), p_duracion_min,
            p_precio, coalesce(p_es_adicional, false))
    returning * into v_servicio;
  else
    update public.servicios
    set nombre = trim(p_nombre),
        descripcion = nullif(trim(coalesce(p_descripcion, '')), ''),
        duracion_min = p_duracion_min,
        precio = p_precio,
        es_adicional = coalesce(p_es_adicional, false)
    where id = p_id
    returning * into v_servicio;
    if not found then
      raise exception 'RF-26: no encontramos este servicio.';
    end if;
  end if;

  -- Reemplaza la lista completa: quita a quien ya no está y agrega a los nuevos.
  delete from public.profesional_servicios
  where servicio_id = v_servicio.id and profesional_id <> all (v_profesionales);
  insert into public.profesional_servicios (profesional_id, servicio_id)
  select x, v_servicio.id from unnest(v_profesionales) as x
  on conflict do nothing;

  return v_servicio;
end;
$$;

revoke execute on function public.guardar_servicio(uuid, text, text, integer, integer, boolean, uuid[])
  from public, anon;
grant execute on function public.guardar_servicio(uuid, text, text, integer, integer, boolean, uuid[])
  to authenticated;

-- ============================================================================================
-- Fotos del catálogo (RF-27): bucket público, JPG o PNG de hasta 5 MB
-- ============================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- La lectura pública va por /object/public/fotos/… y no necesita política de select (así
-- tampoco se puede listar el bucket). Escribir, reemplazar y borrar: solo el administrador.
create policy "Administrador sube fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos' and (select public.es_admin()));

create policy "Administrador reemplaza fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (select public.es_admin()))
  with check (bucket_id = 'fotos' and (select public.es_admin()));

create policy "Administrador borra fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos' and (select public.es_admin()));
