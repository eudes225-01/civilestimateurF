// Règles d'accès aux crédits CST (logique pure) : seule la lecture de plans consomme des crédits ;
// le DQE et l'export PDF restent gratuits pour tout compte connecté.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MINIMUM_LECTURE_DEFAUT, fmtCst, fmtXof, minimumLecture, peutLire, cstManquants, forfaitsDe, FORFAITS_DEFAUT, messageCreditsInsuffisants,
} from './acces.js'

const etat = (solde, extra = {}) => ({ statut: 'standard', solde, minimumLecture: 2500, ...extra })

test('le solde minimum pour démarrer une lecture est de 2 500 CST', () => {
  assert.equal(MINIMUM_LECTURE_DEFAUT, 2500)
  assert.equal(minimumLecture({}), 2500)
  assert.equal(minimumLecture(etat(0, { minimumLecture: 3000 })), 3000)
})

test('lecture possible à partir de 2 500 CST, pas en dessous', () => {
  assert.equal(peutLire(etat(2499)), false)
  assert.equal(peutLire(etat(2500)), true)
  assert.equal(peutLire(etat(20000)), true)
  assert.equal(peutLire(etat(0)), false)
})

test('échoue « fermé » : état illisible → lecture verrouillée ; sans backend (dev local) → pas de verrou', () => {
  assert.equal(peutLire(null), false)
  assert.equal(peutLire(undefined, true), false)
  assert.equal(peutLire(null, false), true)
})

test('administrateur : lecture toujours possible, jamais de CST manquants', () => {
  assert.equal(peutLire({ statut: 'admin', admin: true, solde: 0 }), true)
  assert.equal(cstManquants({ statut: 'admin', solde: 0 }), 0)
})

test('CST manquants pour démarrer', () => {
  assert.equal(cstManquants(etat(0)), 2500)
  assert.equal(cstManquants(etat(1800)), 700)
  assert.equal(cstManquants(etat(2500)), 0)
  assert.equal(cstManquants(etat(9000)), 0)
})

test('forfaits : ceux du serveur, sinon 2 500 / 5 000 / 10 000 / 20 000 FCFA (1 FCFA = 1 CST)', () => {
  assert.deepEqual(FORFAITS_DEFAUT.map((f) => f.montant), [2500, 5000, 10000, 20000])
  assert.deepEqual(forfaitsDe(null), FORFAITS_DEFAUT)
  assert.deepEqual(forfaitsDe({ forfaits: [] }), FORFAITS_DEFAUT)
  const serveur = [{ montant: 3000, credits: 3000 }]
  assert.deepEqual(forfaitsDe({ forfaits: serveur }), serveur)
})

test('formats', () => {
  assert.equal(fmtCst(2500), '2 500 CST')
  assert.equal(fmtCst(0), '0 CST')
  assert.equal(fmtXof(20000), '20 000 FCFA')
  assert.equal(fmtCst(1234.6), '1 235 CST')
})

test('messages de crédits insuffisants : démarrage vs lecture interrompue', () => {
  const d = messageCreditsInsuffisants({ solde: 800, requis: 2500, minimum: 2500 }, true)
  assert.match(d, /au moins 2 500 CST/); assert.match(d, /solde : 800 CST/)
  const m = messageCreditsInsuffisants({ solde: 120 }, false)
  assert.match(m, /s'est arrêtée faute de crédits/); assert.match(m, /déjà lues ont été facturées/)
})

const lire = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')

test('App.jsx : plus de paywall, d’onglet verrouillé ni d’abonnement ; DQE et export toujours affichés', () => {
  const src = lire('../App.jsx')
  assert.doesNotMatch(src, /Paywall|useAbonnement|PremiumModal|estPayant|paywallAffiche|contenuAccessible|abo\./)
  assert.match(src, /tab === 'dqe'\s+&& <TabDQE/)
  assert.match(src, /tab === 'export'\s+&& <TabExport/)
  assert.match(src, /useCredits\(/)
})

test('plus aucune mention d’abonnement ni de Premium dans l’interface (hors fichiers de test)', () => {
  for (const f of ['../App.jsx', '../components/Shell.jsx', '../components/CreditsModal.jsx', '../components/AccountMenu.jsx', '../components/PlanAnalyzer.jsx', '../components/LevelPlan.jsx', '../components/StatutBadge.jsx', '../lib/credits.js']) {
    const src = lire(f).replace(/sans abonnement/g, '')
    assert.doesNotMatch(src, /Premium|premium|abonnement s'|Passer Premium/, f)
  }
})

test('le premier appel d’une lecture porte le drapeau « début » (solde minimum exigé par le serveur)', () => {
  const src = lire('./planreader.js')
  assert.match(src, /api\.analysePlan\(messages, \{ debut, lectureId: idLecture \}\)/)
  assert.match(src, /api\.finaliserLecture\(idLecture\)/)
  assert.equal((src.match(/nouvelleLecture\(\)/g) || []).length, 2) // analyzePlans + analyzeNiveau
  const api = lire('./api.js')
  assert.match(api, /debutLecture: !!debut/)
  assert.match(api, /'\/api\/credits\/confirmation\/renvoyer'/)
})

test('conditions : version 3.4, crédits CST, forfaits et solde minimum', () => {
  const src = lire('../data/politiques.js')
  assert.match(src, /POLITIQUES_VERSION = "3\.4"/)
  assert.match(src, /2 500, 5 000, 10 000 ou 20 000 FCFA/)
  assert.match(src, /solde d'au moins 2 487 CST/)
  assert.doesNotMatch(src, /Premium|abonnement Premium|rappel d'échéance/)
})
