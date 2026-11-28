-- =====================================================================
-- Asignar tareas de las tablas compartidas a una persona del equipo.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- (Necesita haber ejecutado antes compartidos.sql)
-- =====================================================================

alter table public.proyectos add column if not exists asignado     uuid references auth.users (id) on delete set null;
alter table public.proyectos add column if not exists asignado_por uuid references auth.users (id) on delete set null;
alter table public.proyectos add column if not exists asignado_en  timestamptz;
create index if not exists proyectos_asignado_idx on public.proyectos (asignado);

-- ---------- Comprobar la asignación y apuntar quién y cuándo ----------
create or replace function public.comprobar_asignado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.asignado is not null and (
    new.tablero_id is null
    or not exists (select 1 from tablero_miembros where tablero_id = new.tablero_id and user_id = new.asignado)
  ) then
    -- Si solo se ha movido la tarea de tabla, se queda sin asignar; si se intenta asignar a quien no toca, error
    if tg_op = 'UPDATE' and new.asignado is not distinct from old.asignado then
      new.asignado := null;
    elsif new.tablero_id is null then
      raise exception 'Solo se pueden asignar tareas de tablas compartidas';
    else
      raise exception 'Esa persona no es miembro de la tabla';
    end if;
  end if;
  if tg_op = 'INSERT' or new.asignado is distinct from old.asignado then
    new.asignado_por := case when new.asignado is null then null else auth.uid() end;
    new.asignado_en  := case when new.asignado is null then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists comprobar_asignado on public.proyectos;
create trigger comprobar_asignado
  before insert or update of asignado, tablero_id on public.proyectos
  for each row execute function public.comprobar_asignado();

-- ---------- Si alguien sale de una tabla, sus tareas de esa tabla quedan sin asignar ----------
create or replace function public.desasignar_al_salir()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update proyectos set asignado = null where tablero_id = old.tablero_id and asignado = old.user_id;
  return old;
end;
$$;

drop trigger if exists desasignar_al_salir on public.tablero_miembros;
create trigger desasignar_al_salir
  after delete on public.tablero_miembros
  for each row execute function public.desasignar_al_salir();
