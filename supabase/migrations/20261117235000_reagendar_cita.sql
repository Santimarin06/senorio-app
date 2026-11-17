-- Reagendar cita y elegir devolución tras no asistir (RF-14, RF-28, RN-07, RN-08, RN-15,
-- RN-16, D-05, D-26, D-27, D-28, D-30, D-45). Se aplica sobre las migraciones anteriores, que
-- no se modifican.
--
-- D-45: el anticipo que pasa a la cita nueva es una fila NUEVA de comprobantes, ya aprobada,
-- con trasladado_desde apuntando al comprobante aprobado de la cita original (mismo archivo,
-- mismo medio y la misma revisión). La original queda intacta como historial.

-- ============================================================================================
-- Columnas
-- ============================================================================================

alter table public.comprobantes
  add column trasladado_desde uuid references public.comprobantes (id) on delete set null;
create index comprobantes_trasladado_desde_idx on public.comprobantes (trasladado_desde);

-- RN-16: momento en que el cliente eligió la devolución del sobrante de una no asistencia.
alter table public.citas add column devolucion_elegida_en timestamptz;

-- Un comprobante PAGADO por el cliente vigente por cita. El traslado no cuenta: así cabe el
-- pago de la diferencia hasta $10.000 (no asistida) o un pago extra (cita futura).
drop index public.comprobantes_un_vigente_por_cita;
create unique index comprobantes_un_vigente_por_cita on public.comprobantes (cita_id)
  where estado <> 'rechazado' and trasladado_desde is null;

-- ============================================================================================
-- Comprobante del cliente: rango de RN-08 descontando lo trasladado
-- ============================================================================================

-- Igual que en 20261117120000_comprobantes_reemplazo.sql, más:
-- - Si reagendar_cita está insertando el traslado (senorio.traslado = 'on', local a su
--   transacción; la API no expone set_config), la fila pasa tal cual.
-- - Con anticipo trasladado, el pago completa hasta $10.000 (mínimo $1) y no supera lo que
--   falta de la cita. Es el mismo cálculo de rangoAnticipo en src/lib/finanzas.ts.
create or replace function public.preparar_comprobante() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas%rowtype;
  v_trasladado integer;
  v_minimo integer;
  v_maximo integer;
begin
  if current_setting('senorio.traslado', true) = 'on' then
    return new;
  end if;

  new.cliente_id := auth.uid();
  new.estado := 'pendiente';
  new.revisado_por := null;
  new.revisado_en := null;
  new.devolucion_monto := null;
  new.devuelto_en := null;
  new.subido_en := now();
  new.trasladado_desde := null;

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

  select coalesce(sum(monto), 0) into v_trasladado
  from public.comprobantes
  where cita_id = new.cita_id and estado = 'aprobado' and trasladado_desde is not null;
  v_minimo := greatest(10000 - v_trasladado, 1);
  v_maximo := v_cita.total - v_trasladado;

  if new.tipo = 'total' and new.monto <> v_maximo then
    raise exception 'RN-08: el pago total debe ser igual a lo que falta de la cita.';
  end if;
  if new.monto < v_minimo or new.monto > v_maximo then
    if v_trasladado = 0 then
      raise exception 'RN-08: el abono va de $10.000 al valor de la cita.';
    end if;
    raise exception 'RN-08: con el anticipo trasladado, el pago va de % a % pesos.', v_minimo, v_maximo;
  end if;
  if new.archivo_path is null or new.archivo_path not like auth.uid()::text || '/%' then
    raise exception 'RF-13: el archivo del comprobante no está en tu carpeta.';
  end if;
  return new;
end;
$$;

-- ============================================================================================
-- Multas: el anticipo cubre la multa solo si lo aprobado suma $10.000 o más
-- ============================================================================================

-- D-28 sigue valiendo para los pagos del cliente (siempre de $10.000 o más). Con un traslado
-- menor (sobrante de una no asistencia) sin la diferencia pagada, la multa nace pendiente.
create or replace function public.generar_multa() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cubierta boolean;
begin
  if new.estado in ('no_asistida', 'cancelada_tarde') and new.estado is distinct from old.estado then
    v_cubierta := (
      select coalesce(sum(monto), 0) from public.comprobantes
      where cita_id = new.id and estado = 'aprobado'
    ) >= 10000;
    insert into public.multas (cliente_id, cita_id, motivo, estado, resuelta_en)
    values (
      new.cliente_id,
      new.id,
      case when new.estado = 'no_asistida' then 'no_asistio' else 'cancelo_tarde' end,
      case when v_cubierta then 'cobrada_anticipo' else 'pendiente' end,
      case when v_cubierta then now() end
    )
    on conflict (cita_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.cobrar_multa_con_anticipo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado = 'aprobado' and old.estado is distinct from 'aprobado'
     and (
       select coalesce(sum(monto), 0) from public.comprobantes
       where cita_id = new.cita_id and estado = 'aprobado'
     ) >= 10000 then
    update public.multas
    set estado = 'cobrada_anticipo'
    where cita_id = new.cita_id and estado = 'pendiente';
  end if;
  return new;
end;
$$;

-- ============================================================================================
-- reagendar_cita (RF-14, D-30)
-- ============================================================================================

-- El dueño mueve su cita a otra franja del mismo profesional, con los mismos servicios,
-- precios y total. En una sola transacción: la original queda 'reagendada' (libera su franja),
-- se crea la nueva con reagendada_desde y el anticipo aprobado pasa a ella. Si algo falla
-- (por ejemplo, la franja nueva choca), no cambia nada.
-- - Caso 'futura': cita confirmada con 4 h o más. Pasa todo el anticipo aprobado; un
--   comprobante aún pendiente se mueve a la cita nueva.
-- - Caso 'no_asistida': dentro de 2 días (hora de Bogotá) desde su fecha, sin devolución
--   elegida ni registrada. Pasa el sobrante (anticipo − multa) y la diferencia hasta $10.000
--   queda para pagar con comprobante (RN-16, D-05).
-- Con multa pendiente no se reagenda (RN-07, D-26). Las 4 h, los 2 días y los $10.000 repiten
-- src/config/negocio.ts (D-23).
-- Es idempotente (como D-37): sobre una cita ya reagendada devuelve la nueva.
create function public.reagendar_cita(p_cita_id uuid, p_inicio timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas%rowtype;
  v_origen public.comprobantes%rowtype;
  v_nueva uuid;
  v_caso text;
  v_aprobado integer;
  v_trasladado integer;
  v_diferencia integer;
  v_dias integer;
  v_fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para reagendar.';
  end if;

  -- for update: bloquea la fila contra un cambio simultáneo (asistencia, cancelación).
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found or v_cita.cliente_id <> auth.uid() then
    raise exception 'No encontramos esta cita.';
  end if;

  if v_cita.estado = 'reagendada' then
    select id into v_nueva from public.citas
    where reagendada_desde = p_cita_id order by creado_en desc limit 1;
    select coalesce(sum(monto), 0) into v_trasladado from public.comprobantes
    where cita_id = v_nueva and estado = 'aprobado' and trasladado_desde is not null;
    v_caso := case
      when exists (select 1 from public.multas where cita_id = p_cita_id and motivo = 'no_asistio')
      then 'no_asistida' else 'futura'
    end;
    return jsonb_build_object(
      'cita_id', v_nueva,
      'caso', v_caso,
      'anticipo_trasladado', v_trasladado,
      'diferencia', case when v_caso = 'no_asistida' then greatest(0, 10000 - v_trasladado) else 0 end
    );
  end if;

  if public.tiene_multa_pendiente(auth.uid()) then
    raise exception 'RN-07: hay una multa pendiente. Págala o habla con el local para reagendar.';
  end if;
  if not exists (select 1 from public.profesionales where id = v_cita.profesional_id and activo) then
    raise exception 'El profesional de esta cita ya no atiende. Habla con el local.';
  end if;

  select coalesce(sum(monto), 0) into v_aprobado
  from public.comprobantes where cita_id = p_cita_id and estado = 'aprobado';

  if v_cita.estado = 'confirmada' then
    if v_cita.inicio - now() < interval '4 hours' then
      raise exception 'RF-14: con menos de 4 horas para la cita ya no se puede reagendar.';
    end if;
    v_caso := 'futura';
    v_trasladado := v_aprobado;
    v_diferencia := 0;
  elsif v_cita.estado = 'no_asistida' then
    v_dias := (now() at time zone 'America/Bogota')::date
              - (v_cita.inicio at time zone 'America/Bogota')::date;
    if v_dias < 0 or v_dias > 2 then
      raise exception 'RF-14: venció el plazo de 2 días para reagendar esta cita.';
    end if;
    if v_cita.devolucion_elegida_en is not null or exists (
      select 1 from public.comprobantes
      where cita_id = p_cita_id and estado = 'aprobado' and devolucion_monto is not null
    ) then
      raise exception 'RN-16: elegiste la devolución del anticipo; esta cita ya no se reagenda.';
    end if;
    v_caso := 'no_asistida';
    v_trasladado := greatest(0, v_aprobado - 10000);
    v_diferencia := greatest(0, 10000 - v_trasladado);
  else
    raise exception 'RF-14: esta cita ya no se puede reagendar.';
  end if;

  if p_inicio is null or p_inicio <= now() then
    raise exception 'La hora elegida ya pasó.';
  end if;
  if p_inicio = v_cita.inicio then
    raise exception 'Elige un horario distinto al actual.';
  end if;
  v_fin := p_inicio + (v_cita.fin - v_cita.inicio);
  perform public.validar_horario_cita(v_cita.profesional_id, p_inicio, v_fin);

  -- Primero se libera la franja original: así la nueva puede solaparse con ella.
  update public.citas set estado = 'reagendada' where id = p_cita_id;
  begin
    insert into public.citas (cliente_id, profesional_id, inicio, fin, total, reagendada_desde)
    values (v_cita.cliente_id, v_cita.profesional_id, p_inicio, v_fin, v_cita.total, p_cita_id)
    returning id into v_nueva;
  exception when exclusion_violation then
    raise exception 'RN-02: esa franja acaba de ocuparse. Elige otra.';
  end;

  insert into public.cita_servicios (cita_id, servicio_id, nombre, duracion_min, precio)
  select v_nueva, servicio_id, nombre, duracion_min, precio
  from public.cita_servicios where cita_id = p_cita_id;

  if v_trasladado > 0 then
    select * into v_origen from public.comprobantes
    where cita_id = p_cita_id and estado = 'aprobado'
    order by revisado_en desc nulls last, creado_en desc
    limit 1;
    perform set_config('senorio.traslado', 'on', true);
    insert into public.comprobantes (
      cita_id, cliente_id, tipo, monto, archivo_path, estado, revisado_por, revisado_en,
      metodo, subido_en, trasladado_desde
    ) values (
      v_nueva, v_cita.cliente_id,
      case when v_trasladado >= v_cita.total then 'total' else 'abono' end,
      v_trasladado, v_origen.archivo_path, 'aprobado', v_origen.revisado_por,
      v_origen.revisado_en, v_origen.metodo, v_origen.subido_en, v_origen.id
    );
    perform set_config('senorio.traslado', 'off', true);
  end if;

  -- Un comprobante que el local aún no revisa sigue a la cita (solo en la futura: en la no
  -- asistida no hay pendiente, porque sin anticipo aprobado la multa bloquea).
  if v_caso = 'futura' then
    update public.comprobantes set cita_id = v_nueva
    where cita_id = p_cita_id and estado = 'pendiente' and trasladado_desde is null;
  end if;

  return jsonb_build_object(
    'cita_id', v_nueva,
    'caso', v_caso,
    'anticipo_trasladado', v_trasladado,
    'diferencia', v_diferencia
  );
end;
$$;

-- ============================================================================================
-- elegir_devolucion (RN-16, D-27)
-- ============================================================================================

-- El dueño de una cita no asistida con anticipo aprobado elige la devolución del sobrante
-- dentro del plazo de 2 días. Después ya no puede reagendarla. Idempotente.
-- Devuelve { devolucion_elegida_en, devolucion } (sobrante − $2.000, mínimo 0).
create function public.elegir_devolucion(p_cita_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas%rowtype;
  v_aprobado integer;
  v_dias integer;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para continuar.';
  end if;
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found or v_cita.cliente_id <> auth.uid() then
    raise exception 'No encontramos esta cita.';
  end if;
  if v_cita.estado <> 'no_asistida' then
    raise exception 'RN-16: la devolución del sobrante se elige solo en una cita no asistida.';
  end if;
  select coalesce(sum(monto), 0) into v_aprobado
  from public.comprobantes where cita_id = p_cita_id and estado = 'aprobado';
  if v_aprobado <= 0 then
    raise exception 'RN-16: esta cita no tiene anticipo aprobado.';
  end if;

  if v_cita.devolucion_elegida_en is null then
    v_dias := (now() at time zone 'America/Bogota')::date
              - (v_cita.inicio at time zone 'America/Bogota')::date;
    if v_dias < 0 or v_dias > 2 then
      raise exception 'RN-16: venció el plazo para elegir. El local registrará tu devolución.';
    end if;
    update public.citas set devolucion_elegida_en = now() where id = p_cita_id
    returning * into v_cita;
  end if;

  return jsonb_build_object(
    'devolucion_elegida_en', v_cita.devolucion_elegida_en,
    'devolucion', greatest(0, greatest(0, v_aprobado - 10000) - 2000)
  );
end;
$$;

-- ============================================================================================
-- registrar_devolucion (RF-28)
-- ============================================================================================

-- El administrador registra lo devuelto de una cita. Una cita reagendada puede tener dos
-- aprobados (traslado y diferencia): el monto se reparte entre los que no tienen devolución,
-- del mayor al menor, en una sola transacción. security invoker: aplica la RLS del
-- administrador sobre comprobantes; el trigger registrar_revision_comprobante pone devuelto_en.
create function public.registrar_devolucion(p_cita_id uuid, p_monto integer) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  r record;
  v_total integer;
  v_restante integer := p_monto;
  v_parte integer;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador registra devoluciones.';
  end if;
  select coalesce(sum(monto), 0) into v_total from public.comprobantes
  where cita_id = p_cita_id and estado = 'aprobado' and devolucion_monto is null;
  if v_total = 0 then
    raise exception 'Esta devolución ya estaba registrada.';
  end if;
  if p_monto is null or p_monto < 0 or p_monto > v_total then
    raise exception 'RF-28: el monto de la devolución no es válido.';
  end if;

  for r in
    select id, monto from public.comprobantes
    where cita_id = p_cita_id and estado = 'aprobado' and devolucion_monto is null
    order by monto desc, id
    for update
  loop
    v_parte := least(r.monto, v_restante);
    update public.comprobantes set devolucion_monto = v_parte where id = r.id;
    v_restante := v_restante - v_parte;
  end loop;
  return p_monto;
end;
$$;

-- ============================================================================================
-- Permisos
-- ============================================================================================

revoke execute on function
  public.reagendar_cita(uuid, timestamptz),
  public.elegir_devolucion(uuid),
  public.registrar_devolucion(uuid, integer)
from public, anon, authenticated;
grant execute on function
  public.reagendar_cita(uuid, timestamptz),
  public.elegir_devolucion(uuid),
  public.registrar_devolucion(uuid, integer)
to authenticated;
