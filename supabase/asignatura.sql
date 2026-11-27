-- =====================================================================
-- Asignatura de cada tarea (para identificarla en el tablero y filtrar).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- =====================================================================

alter table public.proyectos add column if not exists asignatura text not null default '';

-- Las tareas ya importadas de Classroom o Moodle toman la asignatura de su curso
update public.proyectos
set asignatura = trim(origen ->> 'curso')
where asignatura = '' and coalesce(trim(origen ->> 'curso'), '') <> '';
