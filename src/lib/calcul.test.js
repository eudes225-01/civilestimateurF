// src/lib/calcul.test.js — le frontend consomme le moteur partagé sans logique locale :
// mêmes entrées → même DQE que le moteur ; le mode de chiffrage du projet est bien transmis.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { metrerProjet, buildDQE, PRIX } from './metre.js'
import { construireDQE, materiauxEnCsv } from './calcul.js'

const prixMap = Object.fromEntries(PRIX.map((p) => [p.code, p.sac || p.bi]))
const niveau = { nom: 'RDC', rez: true, HSP: 3, surfPlancher: 100, plancher: 'dallePleine', murs: [{ type: 'agglo20', position: 'exterieur', L: 40, H: 3 }], poteaux: [{ nb: 4, a: 0.2, b: 0.2 }] }

describe('construireDQE (wrapper du moteur partagé)', () => {
  test('transmet le mode de chiffrage du projet', () => {
    const compose = metrerProjet([niveau], { modeChiffrage: 'compose' })
    const decompose = metrerProjet([niveau], { modeChiffrage: 'decompose' })
    const a = construireDQE(compose.totaux, prixMap, { K: 1.3, modeChiffrage: 'compose' }, compose.couverture)
    const b = construireDQE(decompose.totaux, prixMap, { K: 1.3, modeChiffrage: 'decompose' }, decompose.couverture)
    assert.equal(a.mode, 'compose'); assert.equal(b.mode, 'decompose')
    assert.ok(!a.lignes.some((l) => l.code === 'acierHA'))
    assert.ok(b.lignes.some((l) => l.code === 'acierHA'))
  })
  test('identique au moteur appelé directement (aucune logique locale)', () => {
    const r = metrerProjet([niveau], {})
    const direct = buildDQE(r.totaux, prixMap, 1.3, { modeChiffrage: undefined, couverture: r.couverture })
    const via = construireDQE(r.totaux, prixMap, { K: 1.3 }, r.couverture)
    assert.equal(via.ht, direct.ht)
  })
  test('K vide → 1,30 ; K invalide → alerte bloquante (pas de repli silencieux)', () => {
    const r = metrerProjet([niveau], {})
    assert.equal(construireDQE(r.totaux, prixMap, { K: '' }).K, 1.3)
    assert.ok(construireDQE(r.totaux, prixMap, { K: 5 }).bloquant)
  })
})

describe('export CSV des matériaux', () => {
  test('BOM, séparateur « ; », virgule décimale, synthèse + détail', () => {
    const csv = materiauxEnCsv(metrerProjet([niveau], {}).materiaux)
    assert.ok(csv.startsWith('\uFEFF"Code";"Désignation"'))
    assert.match(csv, /Détail par ouvrage/)
    assert.match(csv, /"ciment_beton";/)
    assert.match(csv, /\d,\d{2}/)
  })
})
