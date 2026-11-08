// src/lib/calcul.js
// Point d'appel UNIQUE du DQE côté frontend. Aucune formule ici : tout le calcul vit dans le moteur partagé
// (civilestimateur-engine). Ce fichier ne fait que transmettre les réglages du projet (mode de chiffrage, K,
// couverture de lecture) pour que TabDQE, TabExport et le PDF produisent exactement le même DQE.
import { buildDQE } from './metre.js'

export function construireDQE(totaux, prixMap, params = {}, couverture) {
  const K = params.K === '' || params.K === null || params.K === undefined ? 1.3 : params.K
  return buildDQE(totaux, prixMap, K, {
    modeChiffrage: params.modeChiffrage,
    couverture,
    autoriserKHorsBornes: !!params.autoriserKHorsBornes,
  })
}

/** Export CSV (séparateur « ; », UTF-8 avec BOM : s'ouvre correctement dans Excel en français). */
export function materiauxEnCsv(materiaux) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const nb = (v) => String(v ?? '').replace('.', ',')
  const lib = { calcule: 'calculé', estime: 'estimé', a_confirmer: 'à confirmer' }
  const lignes = [['Code', 'Désignation', 'Unité', 'Quantité', 'À commander', 'Statut', 'Ouvrages', 'Niveaux'].map(esc).join(';')]
  ;(materiaux?.synthese || []).forEach((m) => lignes.push([
    esc(m.code), esc(m.designation), esc(m.unite), nb(m.quantite), nb(m.quantiteCommande), esc(lib[m.statut] || m.statut), esc((m.ouvrages || []).join(' | ')), esc((m.niveaux || []).join(' | ')),
  ].join(';')))
  lignes.push('', ['Détail par ouvrage'].map(esc).join(';'), ['Code', 'Désignation', 'Unité', 'Quantité', 'Formule', 'Ouvrage', 'Niveau', 'Statut'].map(esc).join(';'))
  ;(materiaux?.lignes || []).forEach((l) => lignes.push([
    esc(l.code), esc(l.designation), esc(l.unite), nb(l.quantite), esc(l.formule), esc(l.ouvrage), esc(l.niveau), esc(lib[l.statut] || l.statut),
  ].join(';')))
  return '\uFEFF' + lignes.join('\r\n')
}
