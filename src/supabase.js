import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !clave) {
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (en .env.local o en Vercel).')
}

export const supabase = createClient(url ?? 'http://localhost', clave ?? 'falta-clave')
