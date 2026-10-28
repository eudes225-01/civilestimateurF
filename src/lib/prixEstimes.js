// src/lib/prixEstimes.js
// Prix « moyens par défaut » (estime: true) : estimations de marché, non issues du barème RPR.
// Un prix cesse d'être « estimé » dès que l'utilisateur le modifie : le drapeau se déduit donc de l'écart
// entre le prix courant (`pu`) et le prix par défaut (`sac ?? bi`), sans état supplémentaire.
export const prixParDefaut = (p) => p.sac ?? p.bi
export const estEstime = (p) => p.estime === true && p.pu === prixParDefaut(p)
export const estModifie = (p) => p.pu !== prixParDefaut(p)

/** Coefficient K utilisable (≥ 1) ; sinon 1,30. Aligné sur `params.K || 1.3` des onglets DQE / Export. */
export const KDEFAUT = 1.3
export const coeffK = (K) => (Number(K) > 0 ? Number(K) : KDEFAUT)

/** Lignes du DQE métrées (q > 0) qui reposent encore sur un prix moyen estimé. */
export function lignesSurPrixEstimes(lignes = [], prix = []) {
  const estimes = new Set(prix.filter(estEstime).map((p) => p.code))
  return lignes.filter((l) => l.q > 0 && estimes.has(l.code))
}
