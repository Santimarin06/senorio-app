-- Cancelar cita (RF-09, RN-06, RN-15, D-28, D-30, D-37).
-- Se aplica sobre 20261115120000_reservas_y_roles.sql, que no se modifica.
--
-- El cliente no actualiza citas directamente: cancela con cancelar_cita, que valida que la
-- cita sea suya y que aún no empiece, y decide a tiempo o tarde con instantes absolutos.

-- RN-06 y D-28: un anticipo aprobado siempre es de $10.000 o más, así que siempre cubre la
-- multa. Si la cita tiene un comprobante aprobado, la multa nace cobrada del anticipo y no
-- bloquea reservas (RN-07). Sin anticipo aprobado nace pendiente, como antes.
create or replace function public.generar_multa() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cubierta boolean;
begin
  if new.estado in ('no_asistida', 'cancelada_tarde') and new.estado is distinct from old.estado then
    v_cubierta := exists (
      select 1 from public.comprobantes
      where cita_id = new.id and estado = 'aprobado'
    );
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

-- RF-09: el dueño cancela una cita confirmada (o por marcar) que aún no empieza.
-- Con menos de 4 horas queda 'cancelada_tarde' y el trigger generar_multa crea la multa.
-- Las 4 horas repiten HORAS_SIN_MULTA de src/config/negocio.ts (D-23).
-- Es idempotente (D-37): sobre una cita ya cancelada devuelve su resultado, para que un
-- reintento tras perder la respuesta (sin conexión) no se muestre como error.
-- Devuelve { estado, anticipo_aprobado, multa_estado } para que la app muestre lo que
-- realmente quedó en la base.
create function public.cancelar_cita(p_cita_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas%rowtype;
  v_estado text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para cancelar.';
  end if;

  -- for update: bloquea la fila contra un cambio simultáneo del profesional o del administrador.
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found or v_cita.cliente_id <> auth.uid() then
    raise exception 'No encontramos esta cita.';
  end if;

  if v_cita.estado in ('cancelada_a_tiempo', 'cancelada_tarde') then
    v_estado := v_cita.estado;
  elsif v_cita.estado not in ('confirmada', 'por_marcar') or v_cita.inicio <= now() then
    raise exception 'RF-09: esta cita ya no se puede cancelar.';
  else
    -- Resta de instantes (timestamptz): no depende de ninguna zona horaria.
    v_estado := case
      when v_cita.inicio - now() < interval '4 hours' then 'cancelada_tarde'
      else 'cancelada_a_tiempo'
    end;
    update public.citas set estado = v_estado where id = p_cita_id;
  end if;

  return jsonb_build_object(
    'estado', v_estado,
    'anticipo_aprobado', (
      select coalesce(sum(monto), 0) from public.comprobantes
      where cita_id = p_cita_id and estado = 'aprobado'
    ),
    'multa_estado', (select estado from public.multas where cita_id = p_cita_id)
  );
end;
$$;

revoke execute on function public.cancelar_cita(uuid) from public, anon, authenticated;
grant execute on function public.cancelar_cita(uuid) to authenticated;
