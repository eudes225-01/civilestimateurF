// src/data/politiques.js
// Politiques d'utilisation — source unique côté interface (résumé de l'écran d'accueil + conditions complètes).
// Le backend sert le même texte sur GET /api/politiques (civilestimateur-backend/src/routes/politiques.js) :
// à modifier ensemble, en incrémentant POLITIQUES_VERSION.
export const POLITIQUES_VERSION = "2.1"
export const POLITIQUES_DATE = "14 octobre 2026"

export const POLITIQUES_RESUME = [
  "Vos quantités et prix sont calculés avec le Guide du métré et le barème RPR : ce sont des estimations sérieuses, à valider par le professionnel qui signe l'offre (elles ne remplacent ni le CCTP, ni un métré d'exécution, ni une étude géotechnique).",
  "Gratuit avec un compte : projets, niveaux & métré, prix modifiables et DQE complet. Premium : dépôt et lecture automatique des plans, export PDF professionnel.",
  "Le Premium se paie par période (prix et durée affichés avant le paiement, via FedaPay). Il n'y a pas de renouvellement automatique : vous gardez la main.",
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
    "t": "3. Lecture automatique des plans (Premium)",
    "c": "Les plans déposés sont transmis à un prestataire d'analyse automatique d'images (Anthropic) pour en extraire dimensions et éléments. Cette lecture peut comporter des erreurs : vous vérifiez et corrigez les valeurs proposées avant tout calcul. Les fichiers de plans ne sont pas conservés sur nos serveurs et ne sont utilisés que pour produire votre métré."
  },
  {
    "t": "4. Gratuit et Premium",
    "c": "Avec un compte (connexion Google), l'accès est gratuit pour les projets, les niveaux et le métré, les prix modifiables, le DQE complet et l'enregistrement de vos projets. Le Premium débloque le dépôt et la lecture automatique des plans ainsi que l'export PDF professionnel (page de garde, sous-détail des prix, métrés, logo et mentions légales)."
  },
  {
    "t": "5. Abonnement et paiement",
    "c": "L'abonnement Premium est payé par période, au prix et pour la durée indiqués avant le paiement. Il ne se renouvelle pas automatiquement : à son terme, vous choisissez de le prolonger ou non, et la nouvelle durée s'ajoute à celle en cours sans perte de jours. Après chaque paiement, vous recevez par e-mail une confirmation accompagnée d'un PDF qui reproduit l'intégralité de ces conditions ; un e-mail de rappel vous est envoyé avant l'échéance et un autre à l'expiration. Vous pouvez à tout moment vous faire renvoyer cette confirmation depuis le menu de votre compte. À l'expiration, vos projets et vos DQE restent accessibles ; seuls le dépôt de plans et l'export PDF se verrouillent. Le paiement est traité par FedaPay (Mobile Money ou carte) : nous ne stockons aucune donnée bancaire."
  },
  {
    "t": "6. Problèmes de paiement et remboursement",
    "c": "Chaque période est payée d'avance et, une fois activée, n'est pas remboursable. Si un paiement est débité sans que le Premium s'active, ou en cas de double paiement, contactez-nous : nous corrigeons la situation ou remboursons le montant concerné."
  },
  {
    "t": "7. Vos données",
    "c": "Votre nom et votre adresse e-mail Google servent à créer votre compte, retrouver vos projets et vous envoyer les e-mails de service (confirmation de paiement, rappel d'échéance). Vos saisies restent liées à votre compte. Nous ne revendons ni ne partageons vos données de projet. Vous pouvez supprimer votre compte depuis le menu du compte : votre profil, vos projets et votre historique d'abonnement sont alors effacés définitivement. Pour pouvoir prouver le contrat, nous conservons la trace de votre acceptation des conditions (version, date) et de la confirmation de chaque paiement ; ces éléments sont effacés avec votre compte."
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
    "c": "Ces conditions peuvent évoluer, notamment lorsque le service ou le barème change. La version en vigueur est celle affichée sur le site, avec sa date de mise à jour."
  }
]

// Adresse de contact affichée dans les conditions (par défaut archinova87@gmail.com ; surchargeable via VITE_CONTACT_EMAIL).
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'archinova87@gmail.com'
