import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estEstime, estModifie, coeffK, lignesSurPrixEstimes, KDEFAUT } from './prixEstimes.js'

const wc = { code: 'san_wc', bi: 60000, sac: null, estime: true, pu: 60000 }

test('un prix moyen par défaut est « estimé » tant qu’il n’est pas modifié', () => {
  assert.equal(estEstime(wc), true)
  assert.equal(estEstime({ ...wc, pu: 65000 }), false)
  assert.equal(estModifie({ ...wc, pu: 65000 }), true)
})
test('un prix du barème RPR n’est jamais « estimé »', () => {
  assert.equal(estEstime({ code: 'x', bi: 100, sac: null, pu: 100 }), false)
})
test('le prix du sac de ciment sert de référence (sac ?? bi)', () => {
  assert.equal(estModifie({ code: 'ciment50', bi: 6500, sac: 6500, pu: 7000 }), true)
  assert.equal(estModifie({ code: 'ciment50', bi: 6500, sac: 6500, pu: 6500 }), false)
})
test('K : valeur saisie utilisée, 1,30 si vide ou invalide', () => {
  assert.equal(coeffK(1.45), 1.45)
  assert.equal(coeffK(''), KDEFAUT)
  assert.equal(coeffK(undefined), KDEFAUT)
  assert.equal(coeffK(0), KDEFAUT)
})
test('lignes du DQE sur prix estimés : seulement celles métrées et non modifiées', () => {
  const prix = [wc, { code: 'regard', bi: 45000, estime: true, pu: 50000 }]
  const lignes = [{ code: 'san_wc', q: 2 }, { code: 'regard', q: 3 }, { code: 'san_wc', q: 0 }]
  assert.deepEqual(lignesSurPrixEstimes(lignes, prix), [{ code: 'san_wc', q: 2 }])
})
