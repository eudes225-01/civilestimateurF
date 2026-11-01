// src/config/mode.js
// Mode de l'application, réglé par UNE variable d'environnement :
//   VITE_APP_GRATUITE=non (défaut) → version PAYANTE (dépôt de plans et export PDF réservés au Premium)
//   VITE_APP_GRATUITE=oui          → version GRATUITE (aucun abonnement, aucun paiement, aucune mention Premium)
// À régler en même temps que APP_GRATUITE côté backend : c'est le serveur qui fait autorité sur l'accès.
export const APP_GRATUITE = /^(oui|true|1|yes)$/i.test(String(import.meta.env.VITE_APP_GRATUITE || '').trim())
