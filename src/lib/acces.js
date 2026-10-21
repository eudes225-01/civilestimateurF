// src/lib/acces.js
// Règles d'accès aux onglets, en logique pure (sans React) pour pouvoir être testées avec `node --test`.
// Source de vérité unique : App.jsx s'en sert pour les cadenas, la redirection vers le paywall ET l'affichage
// du contenu. Le DQE est gratuit (le backend le confirme : /api/calcul n'exige qu'un compte connecté) ;
// seul l'export PDF est réservé aux abonnés.

/** Onglets réservés aux abonnés (premium ou admin). Tous les autres sont ouverts à tout compte. */
export const ONGLETS_PAYANTS = Object.freeze(['export'])

export const estPayant = (k) => ONGLETS_PAYANTS.includes(k)

/** Le contenu de l'onglet `k` peut-il être affiché pour ce statut d'abonnement ? */
export const contenuAccessible = (k, acces) => !estPayant(k) || !!acces

/** Faut-il afficher l'écran d'abonnement à la place de l'onglet ? */
export const paywallAffiche = (k, acces) => estPayant(k) && !acces
