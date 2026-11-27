-- =====================================================================
-- GitHub: repositorio de cada entrega.
-- El token personal de GitHub se guarda SOLO en el servidor (github_privado, sin políticas RLS:
-- la web no puede leerlo). Lo usa la Edge Function "github" para crear los repositorios.
-- =====================================================================

-- Enlace al repositorio creado para cada tarea
alter table public.proyectos add column if not exists repositorio text;

create table if not exists public.github_privado (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token   text not null,
  cuenta  text not null default '', -- usuario de GitHub (para mostrarlo)
  creado  timestamptz not null default now()
);
alter table public.github_privado enable row level security;
revoke all on public.github_privado from anon, authenticated;
