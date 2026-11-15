-- Catálogo de Señorío Barber: profesionales, servicios y productos (RF-02, RF-03, RF-10).
-- Esquema descrito en docs/decisiones.md (D-18). Dinero en pesos COP enteros.
-- Lectura pública con la anon key, solo de registros activos (RLS).
-- La escritura (CRUD del administrador, RF-26 y RF-27) se habilita cuando exista el rol de administrador.

create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  cargo text,
  foto_url text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  duracion_min integer not null check (duracion_min >= 0),
  precio integer not null check (precio >= 0),
  -- Adicional como la silla relajante: solo junto a un servicio principal (D-02).
  es_adicional boolean not null default false,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  -- Un servicio principal siempre ocupa tiempo en la agenda.
  check (es_adicional or duracion_min > 0)
);

-- Qué servicios presta cada profesional (RN-04).
create table public.profesional_servicios (
  profesional_id uuid not null references public.profesionales (id) on delete cascade,
  servicio_id uuid not null references public.servicios (id) on delete cascade,
  primary key (profesional_id, servicio_id)
);

create index profesional_servicios_servicio_idx on public.profesional_servicios (servicio_id);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  categoria text not null check (categoria in ('cabello', 'barba')),
  precio integer not null check (precio >= 0),
  foto_url text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.profesionales enable row level security;
alter table public.servicios enable row level security;
alter table public.profesional_servicios enable row level security;
alter table public.productos enable row level security;

create policy "Leer profesionales activos" on public.profesionales
  for select to anon, authenticated using (activo);

create policy "Leer servicios activos" on public.servicios
  for select to anon, authenticated using (activo);

create policy "Leer relación profesional-servicio" on public.profesional_servicios
  for select to anon, authenticated using (true);

create policy "Leer productos activos" on public.productos
  for select to anon, authenticated using (activo);
