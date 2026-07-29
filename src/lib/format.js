// src/lib/format.js
// Utilitaires de formatage + état d'accès (période gratuite 3 mois).

const LANCEMENT = new Date(import.meta.env.VITE_LANCEMENT_DATE || '2026-06-26T00:00:00Z')
export const FIN_GRATUIT = new Date(LANCEMENT)
FIN_GRATUIT.setMonth(FIN_GRATUIT.getMonth() + 3)

/** État de l'accès : gratuit jusqu'à FIN_GRATUIT, Premium requis ensuite. */
export function accessState() {
  const now = new Date()
  const gratuit = now < FIN_GRATUIT
  const joursRestants = Math.max(0, Math.ceil((FIN_GRATUIT - now) / 86_400_000))
  return { gratuit, joursRestants, finGratuit: FIN_GRATUIT.toISOString() }
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
