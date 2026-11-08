// src/data/politiques.js
// Politiques d'utilisation — source unique côté interface (résumé de l'écran d'accueil + conditions complètes).
// Le backend sert le même texte sur GET /api/politiques (civilestimateur-backend/src/routes/politiques.js) :
// à modifier ensemble, en incrémentant POLITIQUES_VERSION.
export const POLITIQUES_VERSION = "3.2"
export const POLITIQUES_DATE = "8 novembre 2026"

export const POLITIQUES_RESUME = [
  "Vos quantités et prix sont calculés avec le Guide du métré et le barème RPR : ce sont des estimations sérieuses, à valider par le professionnel qui signe l'offre (elles ne remplacent ni le CCTP, ni un métré d'exécution, ni une étude géotechnique).",
  "Gratuit avec un compte : projets, niveaux & métré, prix modifiables, DQE complet et export PDF professionnel. Seule la lecture automatique des plans consomme des crédits CST.",
  "Les crédits CST s'achètent par forfaits (2 500, 5 000, 10 000 ou 20 000 FCFA, via FedaPay) et se consomment selon le nombre de tokens traités. Pas d'abonnement : vous rechargez quand vous voulez. Solde minimum de 2 500 CST pour démarrer une lecture.",
  "Les calculs suivent des formules publiques et des coefficients (K, prix) que vous ajustez. Les valeurs lues sur vos plans sont toujours à vérifier avant le calcul.",
  "Vos données ne sont ni revendues ni partagées. Les fichiers de plans ne sont pas conservés sur nos serveurs, et vous pouvez supprimer votre compte à tout moment.",
  "Les documents générés vous appartiennent. L'extraction massive ou la revente de la base de prix RPR est interdite."
]

export const POLITIQUES_SECTIONS = [
  {
    "t": "1. Le service",
    "c": "CivilEstimateur produit le métré et le devis quantitatif estimatif (DQE) du gros œuvre en francs CFA, à partir des dimensions que vous saisissez ou des plans que vous déposez. Les quantités s'appuient sur le Guide du métré (Bénin) et les prix sur le barème de prix RPR, que vous pouvez modifier ligne par ligne."
  },
  {
    "t": "2. Valeur des résultats",
    "c": "Les calculs sont déterministes : mêmes données, mêmes résultats, selon des formules publiques et des coefficients que vous contrôlez (coefficient K, prix unitaires, hypothèses de fondation). Le résultat est une estimation professionnelle, pas un engagement de prix : il ne remplace ni le CCTP/CPT, ni un métré d'exécution, ni les prix réels du marché, ni une étude géotechnique. Vous restez responsable de l'offre que vous remettez et des données que vous saisissez."
  },
  {
    "t": "3. Lecture automatique des plans (crédits CST)",
    "c": "Les plans déposés sont transmis à un prestataire d'analyse automatique d'images (Anthropic) pour en extraire dimensions et éléments. Cette lecture peut comporter des erreurs : vous vérifiez et corrigez les valeurs proposées avant tout calcul. Les fichiers de plans ne sont pas conservés sur nos serveurs et ne sont utilisés que pour produire votre métré."
  },
  {
    "t": "4. Gratuit et crédits CST",
    "c": "Avec un compte (connexion Google), l'accès est gratuit pour les projets, les niveaux et le métré, les prix modifiables, le DQE complet, l'export PDF professionnel (page de garde, sous-détail des prix, métrés, logo et mentions légales) et l'enregistrement de vos projets. Seule la lecture automatique des plans consomme des crédits CST (CivilEstimator)."
  },
  {
    "t": "5. Crédits CST et paiement",
    "c": "Les crédits CST s'achètent par forfaits (2 500, 5 000, 10 000 ou 20 000 FCFA) : 1 FCFA payé donne 1 CST. Il n'y a ni abonnement ni renouvellement automatique : vous rechargez quand vous le souhaitez. Les crédits achetés à partir du 1er décembre 2026 sont valables un mois à compter du dernier achat soumis à expiration. Sans nouvelle recharge, seuls les crédits soumis à expiration encore disponibles sont supprimés à l'échéance (un rappel est envoyé par e-mail quelques jours avant). Les crédits présents avant le 1er décembre 2026 et ceux acquis avant cette date restent protégés, y compris après une recharge ultérieure ; les consommations utilisent d'abord les crédits soumis à expiration. Chaque appel de lecture consomme des CST selon le nombre de tokens réellement traités par le service d'analyse (contenu lu et texte produit), au tarif affiché dans la fenêtre d'achat. Un solde minimum de 2 500 CST est exigé pour démarrer une lecture ; seul le coût réellement consommé est débité, et le solde ne peut jamais devenir négatif. Après chaque paiement, vous recevez par e-mail une confirmation accompagnée d'un PDF qui reproduit l'intégralité de ces conditions ; vous pouvez à tout moment vous la faire renvoyer depuis le menu de votre compte. Le paiement est traité par FedaPay (Mobile Money ou carte) : nous ne stockons aucune donnée bancaire."
  },
  {
    "t": "6. Problèmes de paiement et remboursement",
    "c": "Les crédits achetés ne sont pas remboursables, ni en FCFA ni en CST, sauf erreur de notre part. Si une lecture échoue du côté du service d'analyse, les crédits qui lui étaient réservés vous sont restitués. Si un paiement est débité sans que les crédits soient ajoutés, ou en cas de double paiement, contactez-nous : nous corrigeons la situation ou remboursons le montant concerné."
  },
  {
    "t": "7. Vos données",
    "c": "Votre nom et votre adresse e-mail Google servent à créer votre compte, retrouver vos projets et vous envoyer les e-mails de service (confirmation de paiement). Vos saisies restent liées à votre compte. Nous ne revendons ni ne partageons vos données de projet. Vous pouvez supprimer votre compte depuis le menu du compte : votre profil, vos projets, votre solde de crédits et votre historique d'achats sont alors effacés définitivement. Pour pouvoir prouver le contrat, nous conservons la trace de votre acceptation des conditions (version, date) et de la confirmation de chaque paiement ; ces éléments sont effacés avec votre compte."
  },
  {
    "t": "8. Vos documents et usage de la base",
    "c": "Les documents générés (DQE, PDF) vous appartiennent. Le barème de prix et le moteur de calcul restent la propriété de l'éditeur : l'extraction massive, la copie systématique ou la revente de la base sont interdites. Un usage raisonnable est attendu : des limites techniques de débit protègent le service."
  },
  {
    "t": "9. Responsabilité",
    "c": "Nous apportons le plus grand soin au moteur de calcul et aux prix de référence, et nous les tenons à jour. L'éditeur ne peut toutefois être tenu responsable des décisions commerciales ou contractuelles prises sur la seule base d'un devis généré, d'un prix du marché qui a évolué, d'une donnée saisie ou lue de manière erronée, ni d'une fondation inadaptée au sol du terrain. Les résultats doivent être validés par un professionnel avant tout engagement, notamment pour les marchés publics (DNCMP/ARMP) et la fiscalité (DGI)."
  },
  {
    "t": "10. Évolution des conditions",
    "c": "Ces conditions peuvent évoluer, notamment lorsque le service, le barème ou le tarif des crédits change. La version en vigueur est celle affichée sur le site, avec sa date de mise à jour."
  }
]

// Adresse de contact affichée dans les conditions (par défaut archinova87@gmail.com ; surchargeable via VITE_CONTACT_EMAIL).
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'archinova87@gmail.com'

/**
 * Sections affichées selon le mode (APP_GRATUITE) : en version gratuite, plus aucune mention des crédits CST ni du
 * paiement (sections « Crédits et paiement » et « Problèmes de paiement » retirées, les autres renumérotées).
 */
export function sectionsPourMode(gratuite) {
  if (!gratuite) return POLITIQUES_SECTIONS
  const garde = POLITIQUES_SECTIONS.filter((s) => !/^(5|6)\. /.test(s.t)).map((s) => {
    if (/^3\. /.test(s.t)) return { ...s, t: '3. Lecture automatique des plans' }
    if (/^4\. /.test(s.t)) {
      return { t: '4. Gratuité', c: "Avec un compte (connexion Google), l'accès est gratuit : projets, niveaux et métré, prix modifiables, DQE complet, lecture automatique des plans, export PDF professionnel (page de garde, sous-détail des prix, métrés, logo et mentions légales) et enregistrement de vos projets." }
    }
    return {
      ...s,
      c: s.c
        .replace(', le barème ou le tarif des crédits change', ' ou le barème change')
        .replace(' (confirmation de paiement)', '')
        .replace(', votre solde de crédits et votre historique d\'achats sont', ' sont')
        .replace(' et de la confirmation de chaque paiement', ''),
    }
  })
  return garde.map((s, i) => ({ ...s, t: s.t.replace(/^\d+\./, `${i + 1}.`) }))
}
