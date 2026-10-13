// src/lib/api.js
// Client HTTP vers le backend Express.
// Si VITE_API_URL est vide, toutes les fonctions renvoient null silencieusement
// et l'app fonctionne entièrement en mode local (données src/data).

import { jetonSession } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function call(method, path, body) {
  if (!BASE) return null
  // Utilisateur connecté : le jeton de session accompagne chaque appel (routes protégées).
  const jeton = await jetonSession()
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw Object.assign(new Error(err.error || `HTTP ${r.status}`), err)
  }
  return r.json()
}

// PDF du devis : la réponse est un fichier (pas du JSON), d'où une fonction à part.
async function pdfDevis(body, signal) {
  if (!BASE) return null
  const jeton = await jetonSession()
  const r = await fetch(`${BASE}/api/pdf/devis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    body: JSON.stringify(body),
    signal,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw Object.assign(new Error(err.error || `HTTP ${r.status}`), { status: r.status })
  }
  return r.blob()
}

export const api = {
  health:      ()       => call('GET',  '/api/health'),
  access:      ()       => call('GET',  '/api/access'),
  prix:        ()       => call('GET',  '/api/prix'),
  calcul:      (body)   => call('POST', '/api/calcul', body),
  analysePlan: (msgs)   => call('POST', '/api/analyse-plan', { messages: msgs }),
  // Mail de bienvenue : le serveur n'écrit qu'à la toute première connexion du compte.
  bienvenue:   ()       => call('POST', '/api/email/bienvenue'),
  pdfDevis,
}
