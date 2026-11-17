-- DATOS DE PRUEBA (D-01). El catálogo real lo carga el local con el CRUD.
-- Profesionales y servicios: SRS §2 y §4. Productos: inventados por el equipo, el SRS no los define.
-- "Uñas" no se carga: su duración y precio están por definir.
-- Se puede ejecutar varias veces: no duplica filas.
--
-- Cuentas (D-13, D-23): no se crean aquí para no guardar contraseñas en el repo. El administrador
-- y los profesionales se registran en Supabase Auth y luego se les asigna el rol (ver docs).

insert into public.profesionales (id, nombre, cargo) values
  ('11111111-1111-4111-8111-111111111111', 'Mario', 'Barbero'),
  ('22222222-2222-4222-8222-222222222222', 'Camilo', 'Barbero'),
  ('33333333-3333-4333-8333-333333333333', 'Rosmery', 'Manicurista')
on conflict (id) do nothing;

insert into public.servicios (id, nombre, descripcion, duracion_min, precio, es_adicional) values
  ('a0000000-0000-4000-8000-000000000001', 'Corte clásico o moderno', null, 40, 25000, false),
  ('a0000000-0000-4000-8000-000000000002', 'Corte con barba', null, 50, 28000, false),
  ('a0000000-0000-4000-8000-000000000003', 'Mechas', null, 90, 100000, false),
  ('a0000000-0000-4000-8000-000000000004', 'Rayos', null, 90, 120000, false),
  ('a0000000-0000-4000-8000-000000000005', 'Decoloración global', null, 120, 150000, false),
  ('a0000000-0000-4000-8000-000000000006', 'Rizos semipermanentes', 'Duración aproximada', 90, 100000, false),
  ('a0000000-0000-4000-8000-000000000007', 'Mascarilla sencilla', null, 30, 15000, false),
  ('a0000000-0000-4000-8000-000000000008', 'Mascarilla profunda', null, 60, 35000, false),
  ('a0000000-0000-4000-8000-000000000009', 'Silla relajante', 'Adicional: se elige junto a otro servicio', 0, 15000, true)
on conflict (id) do nothing;

-- Barberos: cortes, colorimetría y rizos. Rosmery: mascarillas y silla relajante.
insert into public.profesional_servicios (profesional_id, servicio_id)
select p.id, s.id
from public.profesionales p
cross join public.servicios s
where (p.id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
       and s.id in (
        'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
        'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
        'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006'))
   or (p.id = '33333333-3333-4333-8333-333333333333' and s.id in (
        'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008',
        'a0000000-0000-4000-8000-000000000009'))
on conflict do nothing;

insert into public.productos (nombre, descripcion, categoria, precio)
select v.nombre, v.descripcion, v.categoria, v.precio
from (values
  ('Cera mate', 'Fijación media, acabado natural (dato de prueba)', 'cabello', 30000),
  ('Pomada brillante', 'Fijación fuerte con brillo (dato de prueba)', 'cabello', 32000),
  ('Shampoo para rizos', 'Limpieza suave para cabello rizado (dato de prueba)', 'cabello', 38000),
  ('Aceite para barba', 'Suaviza e hidrata (dato de prueba)', 'barba', 35000),
  ('Bálsamo para barba', 'Controla y da forma (dato de prueba)', 'barba', 33000)
) as v (nombre, descripcion, categoria, precio)
where not exists (select 1 from public.productos p where p.nombre = v.nombre);

-- festivos:inicio
-- Festivos de Colombia 2026 a 2030, generados con scripts/generar-festivos.mjs desde
-- festivosColombia (src/lib/festivos.ts). No se editan a mano.
insert into public.festivos (fecha, nombre) values
  ('2026-01-01', 'Año Nuevo'),
  ('2026-01-12', 'Reyes Magos'),
  ('2026-03-23', 'San José'),
  ('2026-04-02', 'Jueves Santo'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-05-18', 'Ascensión del Señor'),
  ('2026-06-08', 'Corpus Christi'),
  ('2026-06-15', 'Sagrado Corazón'),
  ('2026-06-29', 'San Pedro y San Pablo'),
  ('2026-07-20', 'Día de la Independencia'),
  ('2026-08-07', 'Batalla de Boyacá'),
  ('2026-08-17', 'Asunción de la Virgen'),
  ('2026-10-12', 'Día de la Raza'),
  ('2026-11-02', 'Todos los Santos'),
  ('2026-11-16', 'Independencia de Cartagena'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-01-11', 'Reyes Magos'),
  ('2027-03-22', 'San José'),
  ('2027-03-25', 'Jueves Santo'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-05-10', 'Ascensión del Señor'),
  ('2027-05-31', 'Corpus Christi'),
  ('2027-06-07', 'Sagrado Corazón'),
  ('2027-07-05', 'San Pedro y San Pablo'),
  ('2027-07-20', 'Día de la Independencia'),
  ('2027-08-07', 'Batalla de Boyacá'),
  ('2027-08-16', 'Asunción de la Virgen'),
  ('2027-10-18', 'Día de la Raza'),
  ('2027-11-01', 'Todos los Santos'),
  ('2027-11-15', 'Independencia de Cartagena'),
  ('2027-12-08', 'Inmaculada Concepción'),
  ('2027-12-25', 'Navidad'),
  ('2028-01-01', 'Año Nuevo'),
  ('2028-01-10', 'Reyes Magos'),
  ('2028-03-20', 'San José'),
  ('2028-04-13', 'Jueves Santo'),
  ('2028-04-14', 'Viernes Santo'),
  ('2028-05-01', 'Día del Trabajo'),
  ('2028-05-29', 'Ascensión del Señor'),
  ('2028-06-19', 'Corpus Christi'),
  ('2028-06-26', 'Sagrado Corazón'),
  ('2028-07-03', 'San Pedro y San Pablo'),
  ('2028-07-20', 'Día de la Independencia'),
  ('2028-08-07', 'Batalla de Boyacá'),
  ('2028-08-21', 'Asunción de la Virgen'),
  ('2028-10-16', 'Día de la Raza'),
  ('2028-11-06', 'Todos los Santos'),
  ('2028-11-13', 'Independencia de Cartagena'),
  ('2028-12-08', 'Inmaculada Concepción'),
  ('2028-12-25', 'Navidad'),
  ('2029-01-01', 'Año Nuevo'),
  ('2029-01-08', 'Reyes Magos'),
  ('2029-03-19', 'San José'),
  ('2029-03-29', 'Jueves Santo'),
  ('2029-03-30', 'Viernes Santo'),
  ('2029-05-01', 'Día del Trabajo'),
  ('2029-05-14', 'Ascensión del Señor'),
  ('2029-06-04', 'Corpus Christi'),
  ('2029-06-11', 'Sagrado Corazón'),
  ('2029-07-02', 'San Pedro y San Pablo'),
  ('2029-07-20', 'Día de la Independencia'),
  ('2029-08-07', 'Batalla de Boyacá'),
  ('2029-08-20', 'Asunción de la Virgen'),
  ('2029-10-15', 'Día de la Raza'),
  ('2029-11-05', 'Todos los Santos'),
  ('2029-11-12', 'Independencia de Cartagena'),
  ('2029-12-08', 'Inmaculada Concepción'),
  ('2029-12-25', 'Navidad'),
  ('2030-01-01', 'Año Nuevo'),
  ('2030-01-07', 'Reyes Magos'),
  ('2030-03-25', 'San José'),
  ('2030-04-18', 'Jueves Santo'),
  ('2030-04-19', 'Viernes Santo'),
  ('2030-05-01', 'Día del Trabajo'),
  ('2030-06-03', 'Ascensión del Señor'),
  ('2030-06-24', 'Corpus Christi'),
  ('2030-07-01', 'San Pedro y San Pablo / Sagrado Corazón'),
  ('2030-07-20', 'Día de la Independencia'),
  ('2030-08-07', 'Batalla de Boyacá'),
  ('2030-08-19', 'Asunción de la Virgen'),
  ('2030-10-14', 'Día de la Raza'),
  ('2030-11-04', 'Todos los Santos'),
  ('2030-11-11', 'Independencia de Cartagena'),
  ('2030-12-08', 'Inmaculada Concepción'),
  ('2030-12-25', 'Navidad')
on conflict (fecha) do nothing;
-- festivos:fin
