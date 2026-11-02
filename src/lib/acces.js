// src/lib/acces.js
// Règles d'accès aux crédits CST, en logique pure (sans React) pour pouvoir être testées avec `node --test`.
// Tout compte connecté a accès gratuitement aux projets, au métré, aux prix, au DQE et à l'export PDF.
// Seule la LECTURE AUTOMATIQUE DES PLANS consomme des crédits CST (au nombre de tokens traités) et exige un
// solde minimum pour démarrer. Le serveur reste l'autorité (il refuse la lecture sans solde) ; ces fonctions ne
// servent qu'à afficher les messages et à désactiver les boutons.

/** Solde minimum pour démarrer une lecture, si le serveur ne l'a pas (encore) renvoyé. */
export const MINIMUM_LECTURE_DEFAUT = 2500

const nombre = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/[\u202f\u00a0]/g, ' ')
export const fmtCst = (n) => `${nombre(n)} CST`
export const fmtXof = (n) => `${nombre(n)} FCFA`

/** Solde minimum de lecture d'après l'état d'accès du serveur. */
export const minimumLecture = (etat) => Number(etat?.minimumLecture) || MINIMUM_LECTURE_DEFAUT

/**
 * La lecture de plans peut-elle démarrer ?
 * Échoue « fermé » : état illisible (réseau, serveur) → non. Seule exception : aucun backend (développement local).
 */
export function peutLire(etat, backendActif = true) {
  if (!backendActif) return true
  if (!etat) return false
  if (etat.admin || etat.statut === 'admin') return true
  return (Number(etat.solde) || 0) >= minimumLecture(etat)
}

/** CST manquants pour pouvoir démarrer une lecture (0 si le solde suffit). */
export const cstManquants = (etat) => (etat?.admin || etat?.statut === 'admin' ? 0 : Math.max(0, minimumLecture(etat) - (Number(etat?.solde) || 0)))

/** Forfaits (montant FCFA → CST) : ceux du serveur, sinon les forfaits par défaut. */
export const FORFAITS_DEFAUT = Object.freeze([2500, 5000, 10000, 20000].map((montant) => Object.freeze({ montant, credits: montant })))
export const forfaitsDe = (etat) => (Array.isArray(etat?.forfaits) && etat.forfaits.length ? etat.forfaits : FORFAITS_DEFAUT)

/** Message d'erreur affiché quand le serveur refuse une lecture faute de crédits. */
export function messageCreditsInsuffisants({ solde = 0, requis, minimum } = {}, debut = true) {
  const besoin = requis ?? minimum ?? MINIMUM_LECTURE_DEFAUT
  return debut
    ? `Crédits CST insuffisants : il faut au moins ${fmtCst(besoin)} pour démarrer une lecture de plans (solde : ${fmtCst(solde)}). Rechargez vos crédits puis relancez.`
    : `La lecture s'est arrêtée faute de crédits CST (solde : ${fmtCst(solde)}). Les parties déjà lues ont été facturées ; rechargez vos crédits puis relancez.`
}
