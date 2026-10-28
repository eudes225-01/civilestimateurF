// src/lib/planGate.js
// Types de plans déposables. Depuis le plan d'amélioration « lecture de plans », plus aucun
// plan n'est obligatoire : le dépôt libre classe automatiquement chaque vue.
//
// « Plan de ferraillage » : ce n'est pas l'un des 8 types lus par le moteur
// (codification des plans). Il est donc déposé et exigé comme les autres, mais
// conservé comme pièce du dossier — il n'est pas encore lu automatiquement.
import { TYPES_PLANS, CLES_TYPES_PLANS } from 'civilestimateur-engine'

export const FERRAILLAGE = {
  lab: 'Plan de ferraillage',
  court: 'Ferraillage',
  module: 'Pièce du dossier (non lue automatiquement)',
  repere: 'HA<Ø>, cadres, espacements, enrobage · nomenclature des armatures',
}

/** Types déposables : les 8 types du moteur + le plan de ferraillage. */
export const CLES_DEPOT = [...CLES_TYPES_PLANS, 'ferraillage']
export const typeDepot = (k) => (k === 'ferraillage' ? FERRAILLAGE : TYPES_PLANS[k])

/**
 * Plans RECOMMANDÉS (et non plus obligatoires) : aucun ne bloque l'accès à l'étape suivante.
 * Ce qui manque se mesure par le score de couverture du moteur (evaluerCouverture) et ne
 * remonte que sous forme de questions ciblées (voir ValidationExceptions).
 */
export const PLANS_RECOMMANDES = [
  { cle: 'plan',        lab: 'Plan architectural coté' },
  { cle: 'fondation',   lab: 'Plan de fondation' },
  { cle: 'coffrage',    lab: 'Plan de coffrage' },
  { cle: 'coupe',       lab: 'Plan de coupe' },
  { cle: 'toiture',     lab: 'Plan de toiture' },
  { cle: 'ferraillage', lab: 'Plan de ferraillage' },
]

export const estRecommande = (cle) => PLANS_RECOMMANDES.some((p) => p.cle === cle)

/** Plans recommandés sans aucun fichier déposé (information, jamais un verrou). */
export const plansAbsents = (depots = {}) =>
  PLANS_RECOMMANDES.filter((p) => !(depots[p.cle] && depots[p.cle].length > 0))

/** Clé du dépôt libre : l'utilisateur dépose sans classer, chaque vue est reconnue automatiquement. */
export const DEPOT_LIBRE = 'libre'
