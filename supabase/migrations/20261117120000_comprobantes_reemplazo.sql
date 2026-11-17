-- Comprobantes del anticipo: medio de pago, fecha de subida y reemplazo de la imagen
-- (RF-13, RN-07, RN-08, RN-09, D-38). Se aplica sobre 20261115120000_reservas_y_roles.sql,
-- que no se modifica.

-- Medio con el que el cliente dice haber pagado (D-04) y momento en que subió la imagen.
-- metodo es opcional para no romper los comprobantes que ya existen.
alter table public.comprobantes
  add column metodo text check (metodo in ('nequi', 'bold', 'bancolombia')),
  add column subido_en timestamptz not null default now();

grant insert (metodo) on public.comprobantes to authenticated;

-- RF-13, RN-07, RN-08: igual que antes, y además el archivo debe estar en la carpeta del
-- propio cliente dentro del bucket (<cliente_id>/<archivo>).
create or replace function public.preparar_comprobante() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas%rowtype;
begin
  new.cliente_id := auth.uid();
  new.estado := 'pendiente';
  new.revisado_por := null;
  new.revisado_en := null;
  new.devolucion_monto := null;
  new.devuelto_en := null;
  new.subido_en := now();

  select * into v_cita from public.citas where id = new.cita_id;
  if not found or v_cita.cliente_id <> auth.uid() then
    raise exception 'No encontramos esta cita.';
  end if;
  if v_cita.estado <> 'confirmada' or v_cita.inicio <= now() then
    raise exception 'RF-13: solo se paga anticipo de una cita confirmada que aún no ha pasado.';
  end if;
  if public.tiene_multa_pendiente(auth.uid()) then
    raise exception 'RN-07: hay una multa pendiente. Págala antes de enviar un anticipo.';
  end if;
  if new.tipo = 'total' and new.monto <> v_cita.total then
    raise exception 'RN-08: el pago total debe ser igual al valor de la cita.';
  end if;
  if new.monto < 10000 or new.monto > v_cita.total then
    raise exception 'RN-08: el abono va de $10.000 al valor de la cita.';
  end if;
  if new.archivo_path is null or new.archivo_path not like auth.uid()::text || '/%' then
    raise exception 'RF-13: el archivo del comprobante no está en tu carpeta.';
  end if;
  return new;
end;
$$;

-- RF-13: el cliente cambia la imagen de un comprobante que sigue pendiente. No crea otra
-- fila (respeta comprobantes_un_vigente_por_cita) y es atómico: si algo falla, el
-- comprobante queda como estaba. Uno aprobado o rechazado no se toca.
create function public.reemplazar_comprobante(p_comprobante_id uuid, p_archivo_path text)
returns public.comprobantes
language plpgsql security definer set search_path = ''
as $$
declare
  v_comprobante public.comprobantes%rowtype;
begin
  select * into v_comprobante
  from public.comprobantes
  where id = p_comprobante_id
  for update;

  if not found or v_comprobante.cliente_id <> auth.uid() then
    raise exception 'No encontramos este comprobante.';
  end if;
  if v_comprobante.estado <> 'pendiente' then
    raise exception 'RF-13: solo se reemplaza un comprobante pendiente de revisión.';
  end if;
  if p_archivo_path is null or p_archivo_path not like auth.uid()::text || '/%' then
    raise exception 'RF-13: el archivo del comprobante no está en tu carpeta.';
  end if;

  update public.comprobantes
  set archivo_path = p_archivo_path, subido_en = now()
  where id = p_comprobante_id
  returning * into v_comprobante;

  return v_comprobante;
end;
$$;

revoke execute on function public.reemplazar_comprobante(uuid, text) from public, anon, authenticated;
grant execute on function public.reemplazar_comprobante(uuid, text) to authenticated;
