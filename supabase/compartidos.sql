-- =====================================================================
-- Tablas compartidas: tableros con varios miembros.
-- Las tareas con tablero_id = null siguen siendo el tablero personal (privado).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------- Tableros y miembros ----------
create table if not exists public.tableros (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null check (length(trim(nombre)) > 0),
  creador uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creado  timestamptz not null default now()
);

create table if not exists public.tablero_miembros (
  tablero_id uuid not null references public.tableros (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rol        text not null default 'miembro' check (rol in ('propietario', 'miembro')),
  creado     timestamptz not null default now(),
  primary key (tablero_id, user_id)
);
create index if not exists tablero_miembros_user_idx on public.tablero_miembros (user_id);

alter table public.proyectos add column if not exists tablero_id uuid references public.tableros (id) on delete cascade;
create index if not exists proyectos_tablero_idx on public.proyectos (tablero_id);

-- ---------- Comprobaciones (security definer: no dependen de RLS y evitan recursión) ----------
create or replace function public.es_miembro(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tablero_miembros where tablero_id = t and user_id = auth.uid());
$$;

create or replace function public.es_propietario(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tablero_miembros where tablero_id = t and user_id = auth.uid() and rol = 'propietario');
$$;

-- ---------- Acciones ----------
-- Crear un tablero: quien lo crea queda como propietario
create or replace function public.crear_tablero(nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare nuevo uuid;
begin
  if auth.uid() is null then raise exception 'Sesión no válida'; end if;
  if length(trim(coalesce(nombre, ''))) = 0 then raise exception 'El nombre es obligatorio'; end if;
  insert into tableros (nombre, creador) values (trim(nombre), auth.uid()) returning id into nuevo;
  insert into tablero_miembros (tablero_id, user_id, rol) values (nuevo, auth.uid(), 'propietario');
  return nuevo;
end;
$$;

-- Añadir a alguien por su correo (solo el propietario)
create or replace function public.invitar_a_tablero(t uuid, correo text)
returns void language plpgsql security definer set search_path = public as $$
declare invitado uuid;
begin
  if not es_propietario(t) then raise exception 'Solo el propietario puede añadir miembros'; end if;
  select id into invitado from perfiles where lower(email) = lower(trim(correo));
  if invitado is null then raise exception 'No hay ninguna cuenta con el correo %', trim(correo); end if;
  insert into tablero_miembros (tablero_id, user_id) values (t, invitado) on conflict do nothing;
end;
$$;

-- Miembros de un tablero con su nombre y correo (solo si eres miembro)
create or replace function public.miembros_tablero(t uuid)
returns table (user_id uuid, nombre text, email text, rol text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.nombre, p.email, m.rol
  from tablero_miembros m join perfiles p on p.id = m.user_id
  where m.tablero_id = t and es_miembro(t)
  order by m.rol desc, p.nombre;
$$;

-- Nombres de las personas con las que comparto algún tablero (para comentarios e informador)
create or replace function public.companeros()
returns table (id uuid, nombre text)
language sql stable security definer set search_path = public as $$
  select distinct p.id, p.nombre
  from tablero_miembros yo
  join tablero_miembros otro on otro.tablero_id = yo.tablero_id
  join perfiles p on p.id = otro.user_id
  where yo.user_id = auth.uid();
$$;

revoke all on function public.crear_tablero(text), public.invitar_a_tablero(uuid, text),
  public.miembros_tablero(uuid), public.companeros() from anon;

-- ---------- Seguridad (RLS) ----------
alter table public.tableros         enable row level security;
alter table public.tablero_miembros enable row level security;

drop policy if exists "ver tableros" on public.tableros;
create policy "ver tableros" on public.tableros
  for select to authenticated using (public.es_miembro(id));

drop policy if exists "renombrar tablero" on public.tableros;
create policy "renombrar tablero" on public.tableros
  for update to authenticated using (public.es_propietario(id)) with check (public.es_propietario(id));

drop policy if exists "borrar tablero" on public.tableros;
create policy "borrar tablero" on public.tableros
  for delete to authenticated using (public.es_propietario(id));

-- Miembros: los ven los demás miembros; uno puede salirse y el propietario puede quitar a otros
drop policy if exists "ver miembros" on public.tablero_miembros;
create policy "ver miembros" on public.tablero_miembros
  for select to authenticated using (public.es_miembro(tablero_id));

drop policy if exists "quitar miembros" on public.tablero_miembros;
create policy "quitar miembros" on public.tablero_miembros
  for delete to authenticated
  using ((user_id = auth.uid() and rol <> 'propietario') or (public.es_propietario(tablero_id) and user_id <> auth.uid()));

-- Proyectos: los míos personales o los de tableros donde soy miembro
drop policy if exists "mis proyectos" on public.proyectos;
create policy "mis proyectos" on public.proyectos
  for all to authenticated
  using ((tablero_id is null and user_id = auth.uid()) or (tablero_id is not null and public.es_miembro(tablero_id)))
  with check ((tablero_id is null and user_id = auth.uid()) or (tablero_id is not null and public.es_miembro(tablero_id)));

-- Comentarios: se ven los de cualquier proyecto que puedo ver; cada uno solo escribe y borra los suyos
drop policy if exists "mis comentarios" on public.comentarios;
drop policy if exists "ver comentarios" on public.comentarios;
create policy "ver comentarios" on public.comentarios
  for select to authenticated
  using (exists (select 1 from public.proyectos p where p.id = proyecto_id));

drop policy if exists "escribir comentarios" on public.comentarios;
create policy "escribir comentarios" on public.comentarios
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.proyectos p where p.id = proyecto_id));

drop policy if exists "borrar mis comentarios" on public.comentarios;
create policy "borrar mis comentarios" on public.comentarios
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Tiempo real: ver al momento los cambios de los demás ----------
do $$
declare t text;
begin
  foreach t in array array['proyectos', 'comentarios', 'tableros', 'tablero_miembros'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
