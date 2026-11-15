-- DATOS DE PRUEBA (D-01). El catálogo real lo carga el local con el CRUD.
-- Profesionales y servicios: SRS §2 y §4. Productos: inventados por el equipo, el SRS no los define.
-- "Uñas" no se carga: su duración y precio están por definir.

insert into public.profesionales (id, nombre, cargo) values
  ('11111111-1111-4111-8111-111111111111', 'Mario', 'Barbero'),
  ('22222222-2222-4222-8222-222222222222', 'Camilo', 'Barbero'),
  ('33333333-3333-4333-8333-333333333333', 'Rosmery', 'Manicurista');

insert into public.servicios (id, nombre, descripcion, duracion_min, precio, es_adicional) values
  ('a0000000-0000-4000-8000-000000000001', 'Corte clásico o moderno', null, 40, 25000, false),
  ('a0000000-0000-4000-8000-000000000002', 'Corte con barba', null, 50, 28000, false),
  ('a0000000-0000-4000-8000-000000000003', 'Mechas', null, 90, 100000, false),
  ('a0000000-0000-4000-8000-000000000004', 'Rayos', null, 90, 120000, false),
  ('a0000000-0000-4000-8000-000000000005', 'Decoloración global', null, 120, 150000, false),
  ('a0000000-0000-4000-8000-000000000006', 'Rizos semipermanentes', 'Duración aproximada', 90, 100000, false),
  ('a0000000-0000-4000-8000-000000000007', 'Mascarilla sencilla', null, 30, 15000, false),
  ('a0000000-0000-4000-8000-000000000008', 'Mascarilla profunda', null, 60, 35000, false),
  ('a0000000-0000-4000-8000-000000000009', 'Silla relajante', 'Adicional: se elige junto a otro servicio', 0, 15000, true);

-- Barberos: cortes, colorimetría y rizos. Rosmery: mascarillas y silla relajante.
insert into public.profesional_servicios (profesional_id, servicio_id)
select p.id, s.id
from public.profesionales p
cross join public.servicios s
where (p.nombre in ('Mario', 'Camilo') and s.id in (
        'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
        'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
        'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006'))
   or (p.nombre = 'Rosmery' and s.id in (
        'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008',
        'a0000000-0000-4000-8000-000000000009'));

insert into public.productos (nombre, descripcion, categoria, precio) values
  ('Cera mate', 'Fijación media, acabado natural (dato de prueba)', 'cabello', 30000),
  ('Pomada brillante', 'Fijación fuerte con brillo (dato de prueba)', 'cabello', 32000),
  ('Shampoo para rizos', 'Limpieza suave para cabello rizado (dato de prueba)', 'cabello', 38000),
  ('Aceite para barba', 'Suaviza e hidrata (dato de prueba)', 'barba', 35000),
  ('Bálsamo para barba', 'Controla y da forma (dato de prueba)', 'barba', 33000);
