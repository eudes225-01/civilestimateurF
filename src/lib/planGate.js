// src/lib/planGate.js
// Plans obligatoires pour passer à l'étape suivante. Le métré refuse d'avancer
// tant qu'un de ces plans n'est pas déposé (au moins un fichier par type).
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

/** Plans obligatoires, dans l'ordre d'affichage (libellés de l'utilisateur). */
export const PLANS_OBLIGATOIRES = [
  { cle: 'plan',        lab: 'Plan architectural coté' },
  { cle: 'fondation',   lab: 'Plan de fondation' },
  { cle: 'coffrage',    lab: 'Plan de coffrage' },
  { cle: 'coupe',       lab: 'Plan de coupe' },
  { cle: 'toiture',     lab: 'Plan de toiture' },
  { cle: 'ferraillage', lab: 'Plan de ferraillage' },
]

export const estObligatoire = (cle) => PLANS_OBLIGATOIRES.some((p) => p.cle === cle)

/** Plans obligatoires sans aucun fichier déposé. */
export const plansManquants = (depots = {}) =>
  PLANS_OBLIGATOIRES.filter((p) => !(depots[p.cle] && depots[p.cle].length > 0))
