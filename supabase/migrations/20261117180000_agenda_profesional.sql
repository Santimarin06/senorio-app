-- Agenda del profesional y asistencia (RF-21, RF-23, RN-05, D-08, D-39).
-- Se aplica sobre las migraciones anteriores, que no se modifican.

-- RF-21: la agenda muestra el anticipo aprobado de cada cita. Hasta ahora solo el cliente y
-- el administrador leían comprobantes; el profesional ve los APROBADOS de sus citas (monto y
-- estado, nada más le sirve). La imagen sigue privada: la política del bucket no cambia.
create policy "Profesional ve anticipos aprobados de sus citas" on public.comprobantes
  for select to authenticated using (
    estado = 'aprobado'
    and exists (
      select 1 from public.citas c
      where c.id = comprobantes.cita_id
        and c.profesional_id = (select public.profesional_actual())
    )
  );

-- RF-23 y D-08: además de lo que ya validaba, el profesional solo marca 'no_asistida' cuando
-- vencieron los 10 minutos de tolerancia. Los 10 minutos repiten toleranciaMinutos de
-- src/config/negocio.ts (D-23): si cambia allá, cambia aquí con otra migración.
-- Sigue sin ser security definer: current_user es el rol de quien hace el cambio.
create or replace function public.validar_cambio_estado_cita() returns trigger
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
    if new.estado = 'no_asistida' and now() < old.inicio + interval '10 minutes' then
      raise exception 'D-08: solo puedes marcar "No asistió" cuando pasen los 10 minutos de tolerancia.';
    end if;
  end if;
  return new;
end;
$$;
