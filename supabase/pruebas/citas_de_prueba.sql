-- DATOS DE PRUEBA PARA EL TELÉFONO. No es parte del seed ni de las migraciones.
-- Se pega en el SQL Editor de Supabase DESPUÉS de crear las cuentas de prueba
-- (Santiago, Laura y Camilo vinculado a su ficha; ver la guía de cuentas).
--
-- Deja cuatro citas con ids fijos (e0000000-...-000N). Cada vez que se ejecuta las borra y las
-- vuelve a crear con fechas relativas a ahora, así que se puede repetir cualquier día:
--   1. Santiago con Mario, futura (desde mañana), confirmada.
--   2. Santiago con Mario, confirmada, empezó hace más de 10 minutos: debe verse "Por marcar"
--      cuando exista RN-05 (D-31). Hoy la app la muestra como Confirmada.
--   3. Laura con Camilo, no asistida, sin anticipo, con su multa pendiente (la crea el trigger).
--   4. Santiago con Camilo, futura (desde pasado mañana), con un comprobante de abono pendiente.
--
-- Qué respeta y qué no:
--   - reservar_cita no acepta inicios pasados ("La hora elegida ya pasó"), así que las cuatro citas
--     se insertan directamente como postgres. Para no saltarse sus reglas, cada franja se valida con
--     validar_horario_cita (horario, almuerzo, domingos, festivos, bloqueos, franjas de 15 min), los
--     servicios son del profesional y el total sale del catálogo. La restricción
--     citas_sin_solapamiento se aplica igual: la franja se busca libre.
--   - La cita 3 pasa a no_asistida haciéndose pasar por Camilo (rol authenticated), así que
--     validar_cambio_estado_cita la revisa como en la app y generar_multa crea la multa.
--   - El comprobante de la cita 4 lo inserta Santiago (rol authenticated): preparar_comprobante y la
--     RLS lo validan. El archivo NO existe en Storage: la ruta es de mentira hasta que se suba una
--     imagen real ahí (Storage > comprobantes > <id de Santiago>/prueba-abono.jpg).
--   - Borrar las citas de prueba borra en cascada sus servicios, comprobante y multa.

begin;

-- Correos de las cuentas: si cambian en la guía, se cambian aquí.
create temporary table cuentas_prueba on commit drop as
select
  (select id from public.perfiles where correo = 'santiago@senorio.test' and rol = 'cliente') as santiago,
  (select id from public.perfiles where correo = 'laura@senorio.test' and rol = 'cliente') as laura,
  (select id from public.perfiles where correo = 'camilo@senorio.test' and rol = 'profesional'
     and profesional_id = '22222222-2222-4222-8222-222222222222') as camilo;
-- Los pasos que se hacen como Santiago (rol authenticated) también leen esta tabla.
grant select on cuentas_prueba to authenticated;

-- Primera franja libre de un profesional a partir de p_desde: hacia adelante (p_paso = 1) o hacia
-- atrás (p_paso = -1), revisando hasta 14 días. Libre = pasa validar_horario_cita y no se solapa
-- con una cita activa del profesional.
create function pg_temp.franja_libre(p_prof uuid, p_desde timestamptz, p_duracion integer, p_paso integer)
returns timestamptz
language plpgsql
as $$
declare
  v_ini timestamptz := date_bin('15 minutes', p_desde, timestamptz '2000-01-01 00:00+00');
  v_fin timestamptz;
begin
  if p_paso > 0 then
    v_ini := v_ini + interval '15 minutes';
  end if;
  for i in 1 .. 14 * 96 loop
    v_fin := v_ini + make_interval(mins => p_duracion);
    begin
      perform public.validar_horario_cita(p_prof, v_ini, v_fin);
      if not exists (
        select 1 from public.citas c
        where c.profesional_id = p_prof
          and c.estado in ('confirmada', 'por_marcar', 'asistida', 'no_asistida')
          and tstzrange(c.inicio, c.fin, '[)') && tstzrange(v_ini, v_fin, '[)')
      ) then
        return v_ini;
      end if;
    exception when raise_exception then
      null; -- franja fuera de horario, en almuerzo, festivo o bloqueada: sigue buscando
    end;
    v_ini := v_ini + make_interval(mins => 15 * p_paso);
  end loop;
  raise exception 'No hay una franja libre en 14 días para el profesional %.', p_prof;
end;
$$;

-- Crea una cita confirmada con un servicio del profesional, en la primera franja libre.
create function pg_temp.crear_cita(p_id uuid, p_cliente uuid, p_prof uuid, p_servicio uuid,
                                   p_desde timestamptz, p_paso integer)
returns void
language plpgsql
as $$
declare
  v_serv public.servicios%rowtype;
  v_ini timestamptz;
begin
  select s.* into v_serv
  from public.servicios s
  join public.profesional_servicios ps on ps.servicio_id = s.id and ps.profesional_id = p_prof
  where s.id = p_servicio and s.activo and not s.es_adicional;
  if not found then
    raise exception 'El servicio % no es un servicio principal activo del profesional %.', p_servicio, p_prof;
  end if;

  v_ini := pg_temp.franja_libre(p_prof, p_desde, v_serv.duracion_min, p_paso);
  insert into public.citas (id, cliente_id, profesional_id, inicio, fin, total)
  values (p_id, p_cliente, p_prof, v_ini, v_ini + make_interval(mins => v_serv.duracion_min), v_serv.precio);
  insert into public.cita_servicios (cita_id, servicio_id, nombre, duracion_min, precio)
  values (p_id, v_serv.id, v_serv.nombre, v_serv.duracion_min, v_serv.precio);
end;
$$;

do $$
declare
  c cuentas_prueba%rowtype;
begin
  select * into c from cuentas_prueba;
  if c.santiago is null or c.laura is null or c.camilo is null then
    raise exception 'Faltan cuentas: registra a Santiago y Laura en la app y vincula a Camilo con su ficha antes de correr este archivo.';
  end if;

  -- Reinicio: borra las citas de prueba de una corrida anterior (cascada a servicios, comprobante y multa).
  delete from public.citas where id in (
    'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',
    'e0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004');

  -- 1. Santiago con Mario, futura: corte clásico (40 min) desde mañana.
  perform pg_temp.crear_cita('e0000000-0000-4000-8000-000000000001', c.santiago,
    '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001',
    now() + interval '1 day', 1);

  -- 2. Santiago con Mario, confirmada y empezada hace más de 10 minutos (tolerancia, RN-05).
  --    Busca hacia atrás desde hace 15 minutos: si se corre fuera del horario, cae en el último día hábil.
  perform pg_temp.crear_cita('e0000000-0000-4000-8000-000000000002', c.santiago,
    '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001',
    now() - interval '15 minutes', -1);

  -- 3. Laura con Camilo, en el pasado (desde ayer hacia atrás); se marca no asistida más abajo.
  perform pg_temp.crear_cita('e0000000-0000-4000-8000-000000000003', c.laura,
    '22222222-2222-4222-8222-222222222222', 'a0000000-0000-4000-8000-000000000001',
    now() - interval '1 day', -1);

  -- 4. Santiago con Camilo, futura: corte con barba (50 min, $28.000) desde pasado mañana.
  perform pg_temp.crear_cita('e0000000-0000-4000-8000-000000000004', c.santiago,
    '22222222-2222-4222-8222-222222222222', 'a0000000-0000-4000-8000-000000000002',
    now() + interval '2 days', 1);
end;
$$;

-- 3b. Camilo marca la no asistencia de Laura como en la app: rol authenticated con su sesión.
--     validar_cambio_estado_cita lo permite (confirmada → no_asistida, después de la hora) y
--     generar_multa crea la multa de $10.000 pendiente. Laura no tiene anticipo.
select set_config('request.jwt.claims',
  json_build_object('sub', (select camilo from cuentas_prueba), 'role', 'authenticated')::text, true);
set local role authenticated;
update public.citas set estado = 'no_asistida' where id = 'e0000000-0000-4000-8000-000000000003';
reset role;

-- 4b. Santiago envía un abono de $10.000 para la cita 4 (RN-08). Queda pendiente de revisión (RN-09).
select set_config('request.jwt.claims',
  json_build_object('sub', (select santiago from cuentas_prueba), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.comprobantes (cita_id, tipo, monto, archivo_path)
select 'e0000000-0000-4000-8000-000000000004', 'abono', 10000, santiago::text || '/prueba-abono.jpg'
from cuentas_prueba;
reset role;
select set_config('request.jwt.claims', '', true);

-- Resultado: las cuatro citas en hora de Bogotá, con su multa y comprobante.
select c.id, p.correo as cliente, pr.nombre as profesional,
       to_char(c.inicio at time zone 'America/Bogota', 'YYYY-MM-DD HH24:MI') as inicio_bogota,
       c.estado, c.total, m.estado as multa, cp.estado as comprobante
from public.citas c
join public.perfiles p on p.id = c.cliente_id
join public.profesionales pr on pr.id = c.profesional_id
left join public.multas m on m.cita_id = c.id
left join public.comprobantes cp on cp.cita_id = c.id
where c.id::text like 'e0000000-0000-4000-8000-00000000000_'
order by c.id;

commit;
