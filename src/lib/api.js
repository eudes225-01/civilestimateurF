// src/lib/api.js
// Client HTTP vers le backend Express.
// Si VITE_API_URL est vide, toutes les fonctions renvoient null silencieusement
// et l'app fonctionne entièrement en mode local (données src/data).

const BASE = import.meta.env.VITE_API_URL || ''

async function call(method, path, body) {
  if (!BASE) return null
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw Object.assign(new Error(err.error || `HTTP ${r.status}`), err)
  }
  return r.json()
}

export const api = {
  health:      ()       => call('GET',  '/api/health'),
  access:      ()       => call('GET',  '/api/access'),
  prix:        ()       => call('GET',  '/api/prix'),
  fondations:  ()       => call('GET',  '/api/fondations'),
  fondationVille: (v)   => call('GET',  `/api/fondations/${encodeURIComponent(v)}`),
  calcul:      (body)   => call('POST', '/api/calcul', body),
  analysePlan: (msgs)   => call('POST', '/api/analyse-plan', { messages: msgs }),
}
