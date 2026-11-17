-- Revisión de comprobantes y multas (RF-25, RF-28, RN-06, RN-07, RN-09, D-28, D-37, D-42).
-- Se aplica sobre las migraciones anteriores, que no se modifican.

-- D-37 (3) y D-28: si la cita se canceló tarde (o no asistió) con el comprobante aún pendiente,
-- la multa nació pendiente. Cuando el administrador aprueba ese comprobante, el anticipo
-- (siempre de $10.000 o más) la cubre: pasa a 'cobrada_anticipo' y deja de bloquear (RN-07).
-- registrar_resolucion_multa pone quién y cuándo. security definer como generar_multa: la
-- regla se cumple aunque cambien los permisos de la tabla multas.
create function public.cobrar_multa_con_anticipo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
    update public.multas
    set estado = 'cobrada_anticipo'
    where cita_id = new.cita_id and estado = 'pendiente';
  end if;
  return new;
end;
$$;

create trigger despues_de_aprobar_comprobante
  after update of estado on public.comprobantes
  for each row execute function public.cobrar_multa_con_anticipo();

revoke execute on function public.cobrar_multa_con_anticipo() from public, anon, authenticated;
