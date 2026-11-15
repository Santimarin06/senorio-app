-- Reservas, roles y panel de Señorío Barber (RF-01, RF-05, RF-09, RF-13, RF-20 a RF-28).
-- Se aplica sobre 20261114120000_catalogo.sql (profesionales, servicios, profesional_servicios,
-- productos), que no se modifica. Decisiones: D-13, D-15, D-21, D-23.
--
-- Dinero: pesos COP enteros. Instantes: timestamptz (UTC); las reglas de horario se evalúan
-- en hora de Bogotá con "at time zone 'America/Bogota'".
--
-- Seguridad: RLS en todas las tablas. Los clientes no insertan citas directamente: reservan con
-- la función reservar_cita, que calcula duración y total desde el catálogo y valida las reglas.
-- La doble reserva la impide la restricción de exclusión citas_sin_solapamiento (RN-02).

create extension if not exists btree_gist with schema extensions;

-- ============================================================================================
-- Perfiles y roles
-- ============================================================================================

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  telefono text,
  correo text,
  rol text not null default 'cliente' check (rol in ('cliente', 'profesional', 'administrador')),
  -- Ficha del catálogo que corresponde a un usuario con rol profesional (D-13).
  profesional_id uuid unique references public.profesionales (id) on delete restrict,
  creado_en timestamptz not null default now(),
  check ((rol = 'profesional') = (profesional_id is not null))
);

-- Funciones auxiliares de las políticas. Son security definer para leer perfiles sin
-- pasar por su propia RLS (evita recursión) y solo devuelven datos del usuario actual.
create function public.rol_actual() returns text
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.rol_actual() = 'administrador', false) $$;

create function public.profesional_actual() returns uuid
language sql stable security definer set search_path = ''
as $$ select profesional_id from public.perfiles where id = auth.uid() and rol = 'profesional' $$;

-- Todo usuario nuevo de Supabase Auth nace como cliente (RF-01). El rol nunca se toma de los
-- metadatos que envía la app: solo el administrador lo cambia con asignar_rol.
create function public.crear_perfil_de_usuario() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, telefono, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    new.raw_user_meta_data ->> 'telefono',
    new.email
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_de_usuario();

-- Usuarios que ya existían antes de esta migración.
insert into public.perfiles (id, nombre, telefono, correo)
select u.id, coalesce(u.raw_user_meta_data ->> 'nombre', ''), u.raw_user_meta_data ->> 'telefono', u.email
from auth.users u
on conflict (id) do nothing;

-- El administrador asigna el rol y la ficha de profesional (D-13, RF-29).
create function public.asignar_rol(p_usuario uuid, p_rol text, p_profesional_id uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede asignar roles.';
  end if;
  update public.perfiles
  set rol = p_rol,
      profesional_id = case when p_rol = 'profesional' then p_profesional_id end
  where id = p_usuario;
  if not found then
    raise exception 'Usuario no encontrado.';
  end if;
end;
$$;

-- ============================================================================================
-- Días de trabajo: festivos, días habilitados y bloqueos (RN-01, RN-10, RF-24, D-09)
-- ============================================================================================

-- Festivos de Colombia. Se cargan con el seed y deben coincidir con la función de src/lib (D-09).
create table public.festivos (
  fecha date primary key,
  nombre text not null
);

-- Una fila reemplaza el horario normal de esa fecha: habilita un domingo o festivo
-- (10:00 a 16:00 por defecto), cambia el horario de un día o lo cierra (abierto = false).
-- El almuerzo de 12:00 a 13:00 sigue bloqueado siempre.
create table public.dias_habilitados (
  fecha date primary key,
  abierto boolean not null default true,
  apertura time not null default '10:00',
  cierre time not null default '16:00',
  nota text,
  check (not abierto or apertura < cierre)
);

-- Franjas que dejan de ofrecerse: días libres o imprevistos. Sin profesional = todo el local.
create table public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid references public.profesionales (id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text,
  creado_en timestamptz not null default now(),
  check (fin > inicio)
);

create index bloqueos_profesional_idx on public.bloqueos (profesional_id);

-- ============================================================================================
-- Citas (RF-05, RF-08, RF-21 a RF-23)
-- ============================================================================================

create table public.citas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfiles (id) on delete restrict,
  profesional_id uuid not null references public.profesionales (id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz not null,
  -- Estados de D-15. "Cancelada tarde" genera multa; "Reagendada" queda en el historial.
  estado text not null default 'confirmada' check (estado in (
    'confirmada', 'por_marcar', 'asistida', 'no_asistida',
    'cancelada_a_tiempo', 'cancelada_tarde', 'reagendada'
  )),
  -- Suma de los precios de cita_servicios al reservar (RN-03).
  total integer not null check (total >= 0),
  reagendada_desde uuid references public.citas (id) on delete set null,
  creado_en timestamptz not null default now(),
  check (fin > inicio),
  -- RN-02: un profesional no puede tener dos citas que se solapen. Las canceladas y
  -- reagendadas liberan la franja. '[)' permite que una cita empiece cuando otra termina.
  constraint citas_sin_solapamiento exclude using gist (
    profesional_id with =,
    tstzrange(inicio, fin, '[)') with &&
  ) where (estado in ('confirmada', 'por_marcar', 'asistida', 'no_asistida'))
);

create index citas_cliente_idx on public.citas (cliente_id);
create index citas_reagendada_desde_idx on public.citas (reagendada_desde);

-- Servicios de cada cita con el nombre, la duración y el precio del momento de reservar:
-- si el administrador cambia el catálogo, las citas ya hechas no cambian.
create table public.cita_servicios (
  cita_id uuid not null references public.citas (id) on delete cascade,
  servicio_id uuid not null references public.servicios (id) on delete restrict,
  nombre text not null,
  duracion_min integer not null check (duracion_min >= 0),
  precio integer not null check (precio >= 0),
  primary key (cita_id, servicio_id)
);

create index cita_servicios_servicio_idx on public.cita_servicios (servicio_id);

-- ============================================================================================
-- Comprobantes de anticipo y multas (RF-13, RF-25, RF-28, RN-06 a RN-09)
-- ============================================================================================

create table public.comprobantes (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.citas (id) on delete cascade,
  cliente_id uuid not null default auth.uid() references public.perfiles (id) on delete restrict,
  tipo text not null check (tipo in ('abono', 'total')),
  monto integer not null check (monto > 0),
  -- Ruta del archivo en el bucket privado "comprobantes": <cliente_id>/<archivo>.
  archivo_path text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  nota_rechazo text,
  revisado_por uuid references public.perfiles (id) on delete set null,
  revisado_en timestamptz,
  -- Devolución registrada por el administrador (RN-15, RN-16).
  devolucion_monto integer check (devolucion_monto >= 0 and devolucion_monto <= monto),
  devuelto_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Una cita tiene a lo sumo un comprobante vigente; uno rechazado se puede reemplazar.
create unique index comprobantes_un_vigente_por_cita on public.comprobantes (cita_id)
  where estado <> 'rechazado';
create index comprobantes_cliente_idx on public.comprobantes (cliente_id);
create index comprobantes_revisado_por_idx on public.comprobantes (revisado_por);

create table public.multas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfiles (id) on delete restrict,
  cita_id uuid not null unique references public.citas (id) on delete cascade,
  motivo text not null check (motivo in ('no_asistio', 'cancelo_tarde')),
  monto integer not null default 10000 check (monto > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'cobrada_anticipo', 'pagada', 'perdonada')),
  resuelta_por uuid references public.perfiles (id) on delete set null,
  resuelta_en timestamptz,
  creado_en timestamptz not null default now()
);

create index multas_cliente_pendiente_idx on public.multas (cliente_id) where estado = 'pendiente';
create index multas_resuelta_por_idx on public.multas (resuelta_por);

-- ============================================================================================
-- Reglas en la base
-- ============================================================================================

-- RN-07 (D-06): con una multa pendiente no se reserva ni se paga anticipo.
create function public.tiene_multa_pendiente(p_cliente uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.multas where cliente_id = p_cliente and estado = 'pendiente') $$;

-- RN-01, RN-10, D-07, D-09 y bloqueos. Los horarios repiten los de src/config/negocio.ts:
-- si cambian allá, se cambian aquí con una migración.
create function public.validar_horario_cita(p_profesional uuid, p_inicio timestamptz, p_fin timestamptz)
returns void
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_ini timestamp := p_inicio at time zone 'America/Bogota';
  v_fin timestamp := p_fin at time zone 'America/Bogota';
  v_fecha date := (p_inicio at time zone 'America/Bogota')::date;
  v_dow integer := extract(dow from p_inicio at time zone 'America/Bogota');
  v_dia public.dias_habilitados%rowtype;
  v_apertura time;
  v_cierre time;
begin
  if extract(second from v_ini) <> 0 or extract(minute from v_ini)::integer % 15 <> 0 then
    raise exception 'D-07: las citas empiezan en franjas de 15 minutos.';
  end if;
  if v_fin::date <> v_fecha then
    raise exception 'RN-01: la cita debe terminar el mismo día.';
  end if;

  select * into v_dia from public.dias_habilitados where fecha = v_fecha;
  if found then
    if not v_dia.abierto then
      raise exception 'RN-10: el local no atiende ese día.';
    end if;
    v_apertura := v_dia.apertura;
    v_cierre := v_dia.cierre;
  elsif v_dow = 0 or exists (select 1 from public.festivos where fecha = v_fecha) then
    raise exception 'RN-10: domingos y festivos están cerrados salvo que el administrador los habilite.';
  elsif v_dow in (5, 6) then
    v_apertura := '09:00';
    v_cierre := '20:30';
  else
    v_apertura := '09:00';
    v_cierre := '19:30';
  end if;

  if v_ini::time < v_apertura or v_fin::time > v_cierre then
    raise exception 'RN-01: la cita queda fuera del horario de atención.';
  end if;
  if v_ini::time < '13:00' and v_fin::time > '12:00' then
    raise exception 'RN-01: de 12:00 m. a 1:00 p. m. es la hora de almuerzo.';
  end if;
  if exists (
    select 1 from public.bloqueos b
    where (b.profesional_id is null or b.profesional_id = p_profesional)
      and tstzrange(b.inicio, b.fin, '[)') && tstzrange(p_inicio, p_fin, '[)')
  ) then
    raise exception 'RF-24: esa franja está bloqueada.';
  end if;
end;
$$;

-- Reserva (RF-05). El cliente reserva para sí; el administrador puede reservar a nombre de un
-- cliente (RF-31). Duración y total salen del catálogo (RN-03), nunca de la app.
create function public.reservar_cita(
  p_profesional_id uuid,
  p_servicio_ids uuid[],
  p_inicio timestamptz,
  p_cliente_id uuid default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_cliente uuid;
  v_cantidad integer := coalesce(cardinality(p_servicio_ids), 0);
  v_encontrados integer;
  v_principales integer;
  v_duracion integer;
  v_total integer;
  v_fin timestamptz;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para reservar.';
  end if;

  if p_cliente_id is not null and p_cliente_id <> auth.uid() then
    if not public.es_admin() then
      raise exception 'RF-31: solo el administrador registra citas a nombre de un cliente.';
    end if;
    if not exists (select 1 from public.perfiles where id = p_cliente_id and rol = 'cliente') then
      raise exception 'Cliente no encontrado.';
    end if;
    v_cliente := p_cliente_id;
  else
    if public.rol_actual() is distinct from 'cliente' then
      raise exception 'Solo un cliente puede reservar para sí mismo.';
    end if;
    v_cliente := auth.uid();
  end if;

  if public.tiene_multa_pendiente(v_cliente) then
    raise exception 'RN-07: hay una multa pendiente. Págala o habla con el local para reservar.';
  end if;
  if v_cantidad = 0 then
    raise exception 'RN-03: elige al menos un servicio.';
  end if;
  if (select count(distinct x) from unnest(p_servicio_ids) as x) <> v_cantidad then
    raise exception 'RN-03: hay servicios repetidos.';
  end if;
  if not exists (select 1 from public.profesionales where id = p_profesional_id and activo) then
    raise exception 'Profesional no encontrado.';
  end if;

  select count(*), count(*) filter (where not s.es_adicional),
         coalesce(sum(s.duracion_min), 0), coalesce(sum(s.precio), 0)
  into v_encontrados, v_principales, v_duracion, v_total
  from public.servicios s
  join public.profesional_servicios ps
    on ps.servicio_id = s.id and ps.profesional_id = p_profesional_id
  where s.id = any (p_servicio_ids) and s.activo;

  if v_encontrados <> v_cantidad then
    raise exception 'RN-04: todos los servicios deben ser del mismo profesional y estar activos.';
  end if;
  if v_principales = 0 then
    raise exception 'D-02: un adicional solo se reserva junto con un servicio principal.';
  end if;
  if p_inicio <= now() then
    raise exception 'La hora elegida ya pasó.';
  end if;

  v_fin := p_inicio + make_interval(mins => v_duracion);
  perform public.validar_horario_cita(p_profesional_id, p_inicio, v_fin);

  begin
    insert into public.citas (cliente_id, profesional_id, inicio, fin, total)
    values (v_cliente, p_profesional_id, p_inicio, v_fin, v_total)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'RN-02: esa franja acaba de ocuparse. Elige otra.';
  end;

  insert into public.cita_servicios (cita_id, servicio_id, nombre, duracion_min, precio)
  select v_id, s.id, s.nombre, s.duracion_min, s.precio
  from public.servicios s
  where s.id = any (p_servicio_ids);

  return v_id;
end;
$$;

-- Horario semanal (RF-04): franjas ocupadas de un profesional sin revelar de quién son.
-- Rango máximo de 31 días por consulta.
create function public.franjas_ocupadas(p_profesional_id uuid, p_desde timestamptz, p_hasta timestamptz)
returns table (inicio timestamptz, fin timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.inicio, c.fin
  from public.citas c
  where p_hasta > p_desde and p_hasta - p_desde <= interval '31 days'
    and c.profesional_id = p_profesional_id
    and c.estado in ('confirmada', 'por_marcar', 'asistida', 'no_asistida')
    and tstzrange(c.inicio, c.fin, '[)') && tstzrange(p_desde, p_hasta, '[)')
  union all
  select b.inicio, b.fin
  from public.bloqueos b
  where p_hasta > p_desde and p_hasta - p_desde <= interval '31 days'
    and (b.profesional_id is null or b.profesional_id = p_profesional_id)
    and tstzrange(b.inicio, b.fin, '[)') && tstzrange(p_desde, p_hasta, '[)')
$$;

-- RF-23: un profesional solo marca sus citas como asistida o no asistida, desde la hora de la
-- cita. Los cambios hechos por funciones security definer (current_user distinto de
-- authenticated) y por el administrador no pasan por esta restricción.
-- Esta función NO es security definer: así current_user es el rol de quien hace el cambio.
create function public.validar_cambio_estado_cita() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado
     and current_user = 'authenticated'
     and not public.es_admin() then
    if new.estado not in ('asistida', 'no_asistida')
       or old.estado not in ('confirmada', 'por_marcar')
       or now() < old.inicio then
      raise exception 'RF-23: solo puedes marcar asistencia de tus citas a partir de su hora.';
    end if;
  end if;
  return new;
end;
$$;

create trigger antes_de_cambiar_estado_cita
  before update of estado on public.citas
  for each row execute function public.validar_cambio_estado_cita();

-- RN-06: la no asistencia y la cancelación tardía generan la multa.
create function public.generar_multa() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado in ('no_asistida', 'cancelada_tarde') and new.estado is distinct from old.estado then
    insert into public.multas (cliente_id, cita_id, motivo)
    values (
      new.cliente_id,
      new.id,
      case when new.estado = 'no_asistida' then 'no_asistio' else 'cancelo_tarde' end
    )
    on conflict (cita_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger despues_de_cambiar_estado_cita
  after update of estado on public.citas
  for each row execute function public.generar_multa();

-- RF-13, RN-07, RN-08: el comprobante nace pendiente, de una cita futura del propio cliente,
-- con un abono entre $10.000 y el total, o el total exacto.
create function public.preparar_comprobante() returns trigger
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
  return new;
end;
$$;

create trigger antes_de_crear_comprobante
  before insert on public.comprobantes
  for each row execute function public.preparar_comprobante();

-- RN-09 y RF-28: quién revisó y cuándo lo pone la base.
create function public.registrar_revision_comprobante() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    new.revisado_por := auth.uid();
    new.revisado_en := now();
  end if;
  if new.devolucion_monto is distinct from old.devolucion_monto and new.devuelto_en is null then
    new.devuelto_en := now();
  end if;
  return new;
end;
$$;

create trigger antes_de_revisar_comprobante
  before update on public.comprobantes
  for each row execute function public.registrar_revision_comprobante();

-- RF-25: quién resolvió la multa y cuándo.
create function public.registrar_resolucion_multa() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    new.resuelta_por := case when new.estado = 'pendiente' then null else auth.uid() end;
    new.resuelta_en := case when new.estado = 'pendiente' then null else now() end;
  end if;
  return new;
end;
$$;

create trigger antes_de_resolver_multa
  before update of estado on public.multas
  for each row execute function public.registrar_resolucion_multa();

-- ============================================================================================
-- Permisos sobre funciones: solo lo necesario queda expuesto por la API
-- ============================================================================================

revoke execute on function
  public.rol_actual(), public.es_admin(), public.profesional_actual(),
  public.crear_perfil_de_usuario(), public.asignar_rol(uuid, text, uuid),
  public.tiene_multa_pendiente(uuid), public.validar_horario_cita(uuid, timestamptz, timestamptz),
  public.reservar_cita(uuid, uuid[], timestamptz, uuid),
  public.franjas_ocupadas(uuid, timestamptz, timestamptz),
  public.validar_cambio_estado_cita(), public.generar_multa(), public.preparar_comprobante(),
  public.registrar_revision_comprobante(), public.registrar_resolucion_multa()
from public, anon, authenticated;

-- Las políticas de usuarios con sesión las usan.
grant execute on function public.rol_actual(), public.es_admin(), public.profesional_actual()
  to authenticated;
grant execute on function public.reservar_cita(uuid, uuid[], timestamptz, uuid) to authenticated;
grant execute on function public.asignar_rol(uuid, text, uuid) to authenticated;
-- El horario semanal se puede consultar antes de iniciar sesión.
grant execute on function public.franjas_ocupadas(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ============================================================================================
-- Permisos sobre columnas: qué puede escribir cada quien (las filas las limita RLS)
-- ============================================================================================

revoke all on public.perfiles, public.citas, public.cita_servicios, public.comprobantes,
  public.multas, public.bloqueos from anon;
revoke insert, update, delete on public.perfiles, public.citas, public.cita_servicios,
  public.comprobantes, public.multas from authenticated;

grant update (nombre, telefono) on public.perfiles to authenticated;
grant update (estado) on public.citas to authenticated;
grant insert (cita_id, tipo, monto, archivo_path) on public.comprobantes to authenticated;
grant update (estado, nota_rechazo, devolucion_monto, devuelto_en) on public.comprobantes to authenticated;
grant update (estado) on public.multas to authenticated;

-- ============================================================================================
-- RLS por rol
-- ============================================================================================

alter table public.perfiles enable row level security;
alter table public.festivos enable row level security;
alter table public.dias_habilitados enable row level security;
alter table public.bloqueos enable row level security;
alter table public.citas enable row level security;
alter table public.cita_servicios enable row level security;
alter table public.comprobantes enable row level security;
alter table public.multas enable row level security;

-- Perfiles: cada quien el suyo; el administrador todos; el profesional, los clientes de sus citas.
create policy "Ver perfiles permitidos" on public.perfiles
  for select to authenticated using (
    id = (select auth.uid())
    or (select public.es_admin())
    or exists (
      select 1 from public.citas c
      where c.cliente_id = perfiles.id and c.profesional_id = (select public.profesional_actual())
    )
  );

create policy "Editar el perfil propio" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Catálogo: lectura pública de activos (migración anterior) y gestión del administrador (RF-26, RF-27, RF-29).
create policy "Administrador gestiona profesionales" on public.profesionales
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "Administrador gestiona servicios" on public.servicios
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "Administrador gestiona profesional_servicios" on public.profesional_servicios
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "Administrador gestiona productos" on public.productos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Calendario: lectura pública, escritura del administrador (RF-24).
create policy "Leer festivos" on public.festivos
  for select to anon, authenticated using (true);
create policy "Administrador gestiona festivos" on public.festivos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "Leer días habilitados" on public.dias_habilitados
  for select to anon, authenticated using (true);
create policy "Administrador gestiona días habilitados" on public.dias_habilitados
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Bloqueos: el motivo puede ser privado; el cliente ve la ocupación con franjas_ocupadas.
create policy "Ver bloqueos propios o del local" on public.bloqueos
  for select to authenticated using (
    (select public.es_admin())
    or profesional_id is null
    or profesional_id = (select public.profesional_actual())
  );
create policy "Administrador gestiona bloqueos" on public.bloqueos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Citas: el cliente ve las suyas; el profesional, solo las propias (RF-21); el administrador, todas (RF-22).
-- Se crean con reservar_cita (no hay política de insert).
create policy "Ver citas permitidas" on public.citas
  for select to authenticated using (
    cliente_id = (select auth.uid())
    or profesional_id = (select public.profesional_actual())
    or (select public.es_admin())
  );
create policy "Marcar asistencia" on public.citas
  for update to authenticated
  using (profesional_id = (select public.profesional_actual()) or (select public.es_admin()))
  with check (profesional_id = (select public.profesional_actual()) or (select public.es_admin()));

-- Servicios de la cita: visibles para quien ve la cita.
create policy "Ver servicios de citas visibles" on public.cita_servicios
  for select to authenticated using (
    exists (select 1 from public.citas c where c.id = cita_servicios.cita_id)
  );

-- Comprobantes: el cliente sube y ve los suyos; el administrador revisa (RN-09, RF-28).
create policy "Ver comprobantes permitidos" on public.comprobantes
  for select to authenticated using (cliente_id = (select auth.uid()) or (select public.es_admin()));
create policy "Cliente sube comprobante de su cita" on public.comprobantes
  for insert to authenticated with check (
    cliente_id = (select auth.uid())
    and exists (
      select 1 from public.citas c
      where c.id = comprobantes.cita_id and c.cliente_id = (select auth.uid())
    )
  );
create policy "Administrador revisa comprobantes" on public.comprobantes
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- Multas: el cliente ve las suyas (RF-15); el administrador las resuelve (RF-25). Las crea generar_multa.
create policy "Ver multas permitidas" on public.multas
  for select to authenticated using (cliente_id = (select auth.uid()) or (select public.es_admin()));
create policy "Administrador resuelve multas" on public.multas
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- ============================================================================================
-- Archivos de comprobantes (RF-13): bucket privado, JPG o PNG de hasta 5 MB
-- ============================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Cliente sube archivos a su carpeta de comprobantes" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Ver archivos de comprobantes propios o como administrador" on storage.objects
  for select to authenticated using (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.es_admin())
    )
  );
