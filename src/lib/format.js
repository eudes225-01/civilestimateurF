// src/lib/format.js
// Utilitaires de formatage.

/** « 2026-03 » → « mars 2026 » (date de version du barème de prix) */
export const fmtMois = (ym) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym || ''))
  if (!m) return String(ym || '')
  return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

/** Formate une Date en « 26/09/2026 » */
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Formate un nombre en « 1 234 567 » (espace insécable comme séparateur milliers) */
export const fmtNum = (n, dec = 2) =>
  (Math.round((n ?? 0) * 10 ** dec) / 10 ** dec)
    .toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Formate un montant FCFA : « 1 234 567 FCFA » */
export const fmtCFA = (n) =>
  `${Math.round(n ?? 0).toLocaleString('fr-FR')} FCFA`
