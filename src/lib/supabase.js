// src/lib/supabase.js
// Client Supabase (comptes Google + base de projets). Sans VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY, `supabase` vaut null : l'application reste en mode local
// (sans compte), utile en développement.
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = URL && KEY ? createClient(URL, KEY) : null
export const comptesActifs = !!supabase

/** Jeton de la session en cours (envoyé au backend pour les routes protégées). */
export async function jetonSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}
