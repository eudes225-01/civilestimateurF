// src/config/mode.js
// Mode de l'application, réglé par UNE variable d'environnement :
//   VITE_APP_GRATUITE=non (défaut) → version à CRÉDITS CST (lecture automatique des plans facturée au token ; le reste est gratuit)
//   VITE_APP_GRATUITE=oui          → version GRATUITE (aucun crédit, aucun paiement, aucune mention des CST)
// À régler en même temps que APP_GRATUITE côté backend : c'est le serveur qui fait autorité sur l'accès.
export const APP_GRATUITE = /^(oui|true|1|yes)$/i.test(String(import.meta.env.VITE_APP_GRATUITE || '').trim())
