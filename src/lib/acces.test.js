// Parcours d'un compte « standard » (connecté, sans abonnement) : il doit atteindre le DQE (gratuit),
// et seulement être arrêté par le paywall sur l'export PDF.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ONGLETS_PAYANTS, estPayant, contenuAccessible, paywallAffiche } from './acces.js'

const PARCOURS = ['projet', 'niveaux', 'prix', 'dqe', 'export']

test('seul l’export PDF est payant', () => {
  assert.deepEqual([...ONGLETS_PAYANTS], ['export'])
  assert.equal(estPayant('dqe'), false)
})

test('compte standard : tous les onglets du parcours sont lisibles sauf l’export', () => {
  const lisibles = PARCOURS.filter((k) => contenuAccessible(k, false))
  assert.deepEqual(lisibles, ['projet', 'niveaux', 'prix', 'dqe'])
})

test('compte standard : le DQE n’affiche PAS le paywall, l’export oui', () => {
  assert.equal(paywallAffiche('dqe', false), false)
  assert.equal(paywallAffiche('export', false), true)
})

test('abonné / admin : tout est accessible, aucun paywall', () => {
  for (const k of PARCOURS) {
    assert.equal(contenuAccessible(k, true), true)
    assert.equal(paywallAffiche(k, true), false)
  }
})

test('à tout instant, un onglet est soit lisible soit derrière le paywall (jamais vide)', () => {
  for (const k of PARCOURS) for (const acces of [true, false]) {
    assert.notEqual(contenuAccessible(k, acces), paywallAffiche(k, acces), `${k} / acces=${acces}`)
  }
})

test('App.jsx n’affiche pas le DQE derrière « abo.acces » (régression : onglet vide pour un compte standard)', () => {
  const src = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /tab === 'dqe'\s+&&\s+abo\.acces/)
  assert.match(src, /tab === 'dqe'\s+&& contenuAccessible\('dqe', abo\.acces\)/)
})
