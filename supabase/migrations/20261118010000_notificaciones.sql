-- Avisos al profesional (RF-30, D-10, D-47).
-- La base registra una fila cuando le reservan una cita nueva al profesional, cuando una cita
-- suya se reagenda (la cita nueva) y cuando el cliente cancela. La app del profesional lee las
-- filas al sincronizar y las muestra como notificación local (expo-notifications). No hay push
-- desde un servidor: con la app cerrada, el aviso llega cuando se vuelve a abrir (límite de D-10).
--
-- El texto (cliente, fecha, servicios) no se guarda: la app lo arma desde la cita, en hora de
-- Bogotá y con el mismo formato del resto de pantallas. El recordatorio de 30 minutos tampoco es
-- una fila: lo programa el teléfono (D-47).
--
-- No modifica reservar_cita ni reagendar_cita: los triggers sobre citas cubren las dos.

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  -- Perfil del profesional que recibe el aviso (cuenta vinculada a la ficha, D-46).
  destinatario_id uuid not null references public.perfiles (id) on delete cascade,
  cita_id uuid not null references public.citas (id) on delete cascade,
  tipo text not null check (tipo in ('cita_nueva', 'cita_reagendada', 'cita_cancelada')),
  creada_en timestamptz not null default now(),
  -- Cuándo el teléfono la mostró como notificación local (evita mostrarla dos veces).
  mostrada_en timestamptz,
  -- Cuándo el profesional la marcó como leída en la tab Avisos.
  leida_en timestamptz
);

create index notificaciones_destinatario_idx
  on public.notificaciones (destinatario_id, creada_en desc);
create index notificaciones_cita_idx on public.notificaciones (cita_id);

alter table public.notificaciones enable row level security;

-- Cada profesional ve y marca solo las suyas. Nadie las crea desde la app: solo los triggers.
create policy "Ver avisos propios" on public.notificaciones
  for select to authenticated using (destinatario_id = (select auth.uid()));
create policy "Marcar avisos propios" on public.notificaciones
  for update to authenticated
  using (destinatario_id = (select auth.uid()))
  with check (destinatario_id = (select auth.uid()));

revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;
grant update (mostrada_en, leida_en) on public.notificaciones to authenticated;

-- Crea el aviso para la cuenta del profesional de la cita. Si la ficha aún no tiene cuenta
-- (fichas del seed, D-46), no hay a quién avisar y no se hace nada.
create function public.avisar_al_profesional() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_destinatario uuid;
  v_tipo text;
begin
  if tg_op = 'INSERT' then
    v_tipo := case when new.reagendada_desde is null then 'cita_nueva' else 'cita_reagendada' end;
  elsif new.estado in ('cancelada_a_tiempo', 'cancelada_tarde')
        and old.estado is distinct from new.estado then
    v_tipo := 'cita_cancelada';
  else
    return new;
  end if;

  select id into v_destinatario
  from public.perfiles
  where profesional_id = new.profesional_id and rol = 'profesional';

  -- Sin cuenta, o el profesional reservó con su propia cuenta: no se avisa.
  if v_destinatario is null or v_destinatario = new.cliente_id then
    return new;
  end if;

  insert into public.notificaciones (destinatario_id, cita_id, tipo)
  values (v_destinatario, new.id, v_tipo);
  return new;
end;
$$;

revoke execute on function public.avisar_al_profesional() from public, anon, authenticated;

create trigger avisar_cita_nueva
  after insert on public.citas
  for each row execute function public.avisar_al_profesional();

create trigger avisar_cita_cancelada
  after update of estado on public.citas
  for each row execute function public.avisar_al_profesional();
