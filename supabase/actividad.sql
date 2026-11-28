-- =====================================================================
-- Cambios de estado de las tareas (para las notificaciones del resumen).
-- Cada vez que una tarea cambia de estado se guarda quién la movió, de dónde y a dónde.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

create table if not exists public.cambios_estado (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null, -- null = lo hizo una integración del servidor
  de          text not null,
  a           text not null,
  creado      timestamptz not null default now()
);
create index if not exists cambios_estado_proyecto_idx on public.cambios_estado (proyecto_id);
create index if not exists cambios_estado_creado_idx on public.cambios_estado (creado desc);

alter table public.cambios_estado enable row level security;

-- Se ven los cambios de cualquier tarea que puedo ver. Nadie los escribe a mano: solo el trigger.
drop policy if exists "ver cambios de estado" on public.cambios_estado;
create policy "ver cambios de estado" on public.cambios_estado
  for select to authenticated
  using (exists (select 1 from public.proyectos p where p.id = proyecto_id));

-- ---------- Trigger: apunta el cambio al actualizar el estado ----------
create or replace function public.apuntar_cambio_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado then
    insert into cambios_estado (proyecto_id, user_id, de, a) values (new.id, auth.uid(), old.estado, new.estado);
  end if;
  return new;
end;
$$;

drop trigger if exists apuntar_cambio_estado on public.proyectos;
create trigger apuntar_cambio_estado
  after update of estado on public.proyectos
  for each row execute function public.apuntar_cambio_estado();

-- Limpieza: los cambios de hace más de 60 días ya no se enseñan
delete from public.cambios_estado where creado < now() - interval '60 days';
