// src/lib/planmerge.test.js
// Consolidation des lectures par type de plan → extraction → moteur.
// Lancer : npm test
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { metrerProjet, PARAMS_DEFAUT, RATIOS_ACIER_DEFAUT, FONDATION_DEFAUT } from 'civilestimateur-engine'
import { cleNiveau, typePlancherDepuisComposition, consolider, estVide, extractionToProject } from './planmerge.js'

const proche = (got, want, tol = 0.011) => assert.ok(Math.abs(got - want) <= tol, `obtenu ${got}, attendu ${want}`)
const lec = (type, data, vue = {}) => ({ type, data, vue: { nom: type, type, ...vue } })

describe('cleNiveau', () => {
  test('variantes de désignation d\'un même niveau', () => {
    ;['RDC', 'rdc', 'Rez-de-chaussée', 'REZ DE CHAUSSÉE', 'R+0', 'Niveau 0'].forEach((n) => assert.equal(cleNiveau(n), 'rdc', n))
    ;['R+1', 'R + 1', '1er étage', 'Étage 1', '1 etage'].forEach((n) => assert.equal(cleNiveau(n), 'r+1', n))
    assert.equal(cleNiveau('R+2'), 'r+2')
    assert.equal(cleNiveau('Sous-sol'), 'ss')
  })
})

describe('typePlancherDepuisComposition', () => {
  test('15+5 et 20+5 exacts', () => {
    assert.deepEqual(typePlancherDepuisComposition(15, 5), { type: 'hourdis15', exact: true })
    assert.deepEqual(typePlancherDepuisComposition(20, 5), { type: 'hourdis20', exact: true })
  })
  test('(16+4) assimilé à 15+5, signalé non exact', () => {
    assert.deepEqual(typePlancherDepuisComposition(16, 4), { type: 'hourdis15', exact: false })
  })
  test('illisible → null', () => assert.equal(typePlancherDepuisComposition(null, 4), null))
})

describe('consolider — plusieurs types de plans', () => {
  const lectures = [
    lec('fondation', {
      detectee: true, type: 'filante', filante: { largeur: 0.4, hauteur: 0.25, lineaire: null },
      profondeurFouille: 1.2, proprete: { ep: 0.05 }, confiance: 'haute', incertitudes: [],
    }),
    lec('plan', {
      nom: 'RDC', HSP: 3.0, confiance: 'haute', incertitudes: [],
      pieces: [{ nom: 'Salon', L: 5, l: 4, confiance: 'haute' }],
      murs: [{ nom: 'Façade', type: 'agglo20', L: 10, H: null, position: 'exterieur', portes: 1, fenetres: 2, confiance: 'haute' }],
      poteaux: [{ nb: 4, a: 0.2, b: 0.2, H: null, confiance: 'basse' }],
    }),
    lec('plan', { nom: 'R+1', HSP: null, confiance: 'haute', incertitudes: [], pieces: [{ nom: 'Chambre', L: 4, l: 3, confiance: 'haute' }], murs: [], poteaux: [] }),
    lec('coupe', { confiance: 'haute', incertitudes: [], niveaux: [{ nom: 'Rez-de-chaussée', HSP: 2.8 }, { nom: '1er étage', HSP: 2.8 }] }),
    lec('coffrage', {
      niveau: 'RDC', confiance: 'haute', incertitudes: [],
      poteaux: [{ nom: 'P1', forme: 'carre', nb: 6, a: 0.25, b: 0.25, H: null }],
      poutres: [{ nom: 'P1(20x40)', nb: 3, L: 5, b: 0.2, h: 0.4 }],
      voiles: [{ nom: 'V1', nb: 1, L: 3, ep: 0.2, H: null }],
      dalles: [{ nom: 'D1', ep: 0.16, surface: 30 }, { nom: 'D2', ep: 0.2, L: 5, l: 4 }],
      chainagesV: [{ nom: 'CV1', nb: 4, a: 0.15, b: 0.15, H: null }],
      consoles: [{ nom: 'C1', nb: 2, L: 1.2, b: 0.2, h: 0.3 }],
    }),
    lec('poutraison', {
      niveau: 'R+1', confiance: 'haute', incertitudes: [],
      poutres: [{ nom: 'P1', nb: 2, L: 4, b: 0.2, h: 0.35 }],
      plancher: { hourdis: 16, compression: 4 },
      nervures: { nb: 20, L: 4, entraxe: 0.6 },
    }),
    lec('plomberie', { appareils: [{ type: 'wc', nb: 2 }], reseaux: [{ reseau: 'EF', diam: 20, L: 10 }, { reseau: 'EV', diam: 100, L: 6, pente: 2 }], regards: [{ nb: 2 }], confiance: 'haute', incertitudes: [] }),
    lec('electricite', { elements: [{ type: 'point_lumineux', nb: 8 }, { type: 'interrupteur_simple', nb: 4 }, { type: 'tableau', nb: 1, repere: 'TGBT' }], confiance: 'haute', incertitudes: [] }),
    lec('toiture', { pente: 30, L: 12, l: 9, debord: 0.5, faitages: [{ L: 12 }], cheneaux: [{ L: 24 }], confiance: 'haute', incertitudes: [] }),
  ]
  const ex = consolider(lectures)

  test('niveaux rapprochés entre plans, dans l\'ordre RDC → R+1', () => {
    assert.deepEqual(ex.niveaux.map((n) => n.cle), ['rdc', 'r+1'])
    assert.deepEqual(ex.niveaux[0]._sources.sort(), ['coffrage', 'coupe', 'plan'])
    assert.deepEqual(ex.niveaux[1]._sources.sort(), ['coupe', 'plan', 'poutraison'])
  })
  test('la coupe fait foi sur les HSP, l\'écart est signalé', () => {
    assert.equal(ex.niveaux[0].HSP, 2.8)
    assert.equal(ex.niveaux[1].HSP, 2.8)
    assert.ok(ex.incertitudes.some((m) => /HSP de 3 m lue sur le plan, 2\.8 m sur la coupe/.test(m)))
  })
  test('le coffrage fait foi sur la vue en plan pour les poteaux', () => {
    assert.equal(ex.niveaux[0].poteaux.length, 1)
    assert.equal(ex.niveaux[0].poteaux[0].nb, 6)
    assert.ok(ex.incertitudes.some((m) => /4 poteau\(x\) lus sur la vue en plan, 6 sur le plan de coffrage/.test(m)))
  })
  test('consoles ajoutées aux poutres du niveau', () => {
    const noms = ex.niveaux[0].poutres.map((p) => p.nom)
    assert.deepEqual(noms, ['P1(20x40)', 'C1'])
  })
  test('plancher à corps creux depuis la poutraison, (16+4) signalé', () => {
    assert.equal(ex.niveaux[1].plancher, 'hourdis15')
    assert.ok(ex.incertitudes.some((m) => /\(16\+4\)/.test(m)))
  })
  test('dalles du coffrage : dalle pleine, épaisseur moyenne pondérée', () => {
    const n = ex.niveaux[0]
    assert.equal(n.plancher, 'dallePleine')
    // D1 : 30 m² × 0,16 ; D2 : 5×4 = 20 m² × 0,20 → (4,8 + 4,0) / 50 = 0,176
    proche(n.epDalle, 0.176, 0.0005)
    proche(n.surfPlancher, 50)
  })
  test('plomberie / électricité / toiture portés par l\'extraction', () => {
    assert.equal(ex.plomberie.appareils.length, 1)
    assert.equal(ex.electricite.elements.length, 3)
    assert.equal(ex.toiture.pente, 30)
  })
  test('trace des vues lues', () => {
    assert.equal(ex.vues.length, lectures.length)
    assert.equal(ex.typesLus.coffrage, 1)
  })
  test('aucune incertitude « fondation absente » quand elle est lue', () => {
    assert.ok(!ex.incertitudes.some((m) => /Aucun plan de fondation/.test(m)))
  })
})

describe('Poutres : jamais comptées deux fois', () => {
  test('coffrage et poutraison sur le même niveau → coffrage retenu + alerte', () => {
    const ex = consolider([
      lec('coffrage', { niveau: 'R+1', poutres: [{ nom: '1', nb: 4, L: 5, b: 0.2, h: 0.4 }], confiance: 'haute' }),
      lec('poutraison', { niveau: 'R+1', poutres: [{ nom: '1', nb: 3, L: 5, b: 0.2, h: 0.4 }], confiance: 'haute' }),
    ])
    assert.equal(ex.niveaux[0].poutres.reduce((s, p) => s + p.nb, 0), 4)
    assert.ok(ex.incertitudes.some((m) => /jamais comptées deux fois/.test(m)))
  })
  test('poutraison seule : ses poutres sont retenues', () => {
    const ex = consolider([lec('poutraison', { niveau: 'RDC', poutres: [{ nb: 2, L: 4, b: 0.2, h: 0.35 }], confiance: 'haute' })])
    assert.equal(ex.niveaux[0].poutres.length, 1)
  })
})

describe('Routage : message de reclassement remonté', () => {
  test('la vue reclassée apparaît dans les incertitudes', () => {
    const ex = consolider([
      lec('coffrage', { niveau: 'RDC', poteaux: [{ nb: 2, a: 0.2, b: 0.2 }], confiance: 'haute' }, { message: 'Vue déposée comme « Fondation » mais reconnue comme « Coffrage »', reclasse: true }),
    ])
    assert.ok(ex.incertitudes.some((m) => /reconnue comme « Coffrage »/.test(m)))
  })
  test('vue non reconnue ignorée sans casser la consolidation', () => {
    const ex = consolider([{ type: null, data: null, vue: { nom: 'x', message: 'Type de plan non reconnu : la vue est ignorée.' } }])
    assert.ok(estVide(ex))
    assert.ok(ex.incertitudes.some((m) => /non reconnu/.test(m)))
  })
})

describe('Poteaux circulaires', () => {
  test('assimilés à un carré, signalé', () => {
    const ex = consolider([lec('coffrage', { niveau: 'RDC', poteaux: [{ nom: 'P1', forme: 'rond', nb: 2, a: 0.3, b: 0.3 }], confiance: 'haute' })])
    assert.ok(ex.incertitudes.some((m) => /circulaires/.test(m)))
  })
})

describe('estVide', () => {
  test('rien → vide', () => assert.equal(estVide(consolider([])), true))
  test('plomberie seule → exploitable', () => {
    assert.equal(estVide(consolider([lec('plomberie', { appareils: [{ type: 'wc', nb: 1 }], confiance: 'haute' })])), false)
  })
})

describe('extractionToProject → moteur (bout en bout)', () => {
  const ex = consolider([
    lec('fondation', { detectee: true, type: 'filante', filante: { largeur: 0.4, hauteur: 0.25 }, profondeurFouille: 1.2, confiance: 'haute' }),
    lec('plan', { nom: 'RDC', HSP: null, confiance: 'haute', pieces: [{ nom: 'Salon', L: 8, l: 10 }], murs: [{ nom: 'M', type: 'agglo20', L: 36, H: null, position: 'exterieur', portes: 1, fenetres: 3 }], poteaux: [] }),
    lec('coupe', { niveaux: [{ nom: 'RDC', HSP: 2.8 }], confiance: 'haute' }),
    lec('coffrage', { niveau: 'RDC', voiles: [{ nb: 2, L: 3, ep: 0.2, H: null }], dalles: [{ ep: 0.15, L: 8, l: 10 }], poteaux: [{ nb: 4, forme: 'carre', a: 0.2, b: 0.2 }], confiance: 'haute' }),
    lec('plomberie', { appareils: [{ type: 'wc', nb: 2 }, { type: 'douche', nb: 1 }], reseaux: [{ reseau: 'EF', diam: 20, L: 10 }, { reseau: 'EV', diam: 100, L: 6, pente: 2 }], confiance: 'haute' }),
    lec('electricite', { elements: [{ type: 'point_lumineux', nb: 8 }, { type: 'interrupteur_simple', nb: 4 }, { type: 'prise_16a', nb: 6 }, { type: 'tableau', nb: 1, repere: 'TGBT' }], confiance: 'haute' }),
    lec('toiture', { pente: 30, L: 12, l: 9, debord: 0.5, faitages: [{ L: 12 }], confiance: 'haute' }),
  ])
  const { levels, patchParams } = extractionToProject(ex)
  const params = {
    ...PARAMS_DEFAUT, ...patchParams,
    ratiosAcier: { ...RATIOS_ACIER_DEFAUT },
    fondation: { ...FONDATION_DEFAUT, ...patchParams.fondation },
  }
  const { totaux, alertes } = metrerProjet(levels, params)

  test('niveaux construits pour le moteur', () => {
    assert.equal(levels.length, 1)
    assert.equal(levels[0].rez, true)
    assert.equal(levels[0].HSP, 2.8)
    assert.equal(levels[0].plancher, 'dallePleine')
    assert.equal(levels[0].voiles.length, 1)
    assert.equal(patchParams.systeme, 'ossature')
  })
  test('fondation filante paramétrée depuis le plan de fondation', () => {
    assert.equal(params.fondation.semL, 0.4)
    assert.equal(params.fondation.semH, 0.25)
    assert.equal(params.fondation.profFouille, 1.2)
  })
  test('voiles : volume = 2 × 3 × 0,2 × 2,8 (HSP de la coupe)', () => proche(totaux.volVoiles, 3.36))
  test('plomberie / électricité calculées par leurs modules', () => {
    assert.equal(totaux.plomberie.nbAppareils, 3)
    proche(totaux.plomberie.reseaux.EF.L, 10)
    assert.equal(totaux.electricite.nbPointsForfait, 14)
    assert.equal(totaux.electricite.nbTableaux, 1)
  })
  test('toiture : surface développée depuis la pente lue', () => {
    // (12 + 1) × (9 + 1) = 130 m² × √(1+0,3²) = 135,7
    proche(totaux.surfToiture, 130 * Math.sqrt(1.09), 0.05)
  })
  test('le calcul ne lève aucune alerte bloquante sur ce jeu cohérent', () => {
    assert.ok(!alertes.some((a) => a.niveau === 'bloquante'), JSON.stringify(alertes.filter((a) => a.niveau === 'bloquante')))
  })
})

describe('Plan de fondation : toutes les données viennent du plan', () => {
  const ex = consolider([
    lec('fondation', {
      detectee: true, type: 'isolees', confiance: 'haute',
      semelles: [{ type: 'S1', nb: 4, L: 1.2, l: 1.2, h: 0.3, prof: 1.5 }],
      avantPoteaux: [{ nom: 'P1', nb: 4, a: 0.25, b: 0.25, H: 1.0 }],
      longrines: [{ nom: 'LN1', nb: 2, L: 5, b: 0.2, h: 0.3 }],
      banche: { b: 0.4, h: 0.9 }, herisson: true,
      proprete: { ep: 0.05 }, profondeurFouille: 1.5,
      prescriptions: ['Assise dans l\'argile sableuse à -1,50 m', 'Assise dans l\'argile sableuse à -1,50 m', 'Béton dosé à 350 kg/m³'],
    }),
  ])
  const { patchParams } = extractionToProject(ex)
  const f = patchParams.fondation

  test('avant-poteaux, banché et hérissonnage portés vers le moteur', () => {
    assert.equal(f.avantPoteaux.length, 1)
    assert.deepEqual({ a: f.banche.actif, b: f.banche.b, h: f.banche.h }, { a: true, b: 0.4, h: 0.9 })
    assert.equal(f.herisson.actif, true)
    assert.equal(f.profFouille, 1.5)
  })
  test('jamais activés par défaut quand le plan ne les montre pas', () => {
    const e2 = consolider([lec('fondation', { detectee: true, type: 'filante', filante: { largeur: 0.4, hauteur: 0.25 }, confiance: 'haute' })])
    const g = extractionToProject(e2).patchParams.fondation
    assert.equal(g.banche, undefined)
    assert.equal(g.moellons, undefined)
    assert.equal(g.herisson, undefined)
  })
  test('prescriptions dédoublonnées, transmises sans effet sur le calcul', () => {
    assert.equal(patchParams.planFlags.prescriptionsFondation.length, 2)
    const params = { ...PARAMS_DEFAUT, ...patchParams, fondation: { ...FONDATION_DEFAUT, ...f } }
    const a = metrerProjet([{ nom: 'RDC', rez: true, HSP: 3, pieces: [{ nom: 'S', L: 5, l: 5 }] }], params).totaux.fondation
    const b = metrerProjet([{ nom: 'RDC', rez: true, HSP: 3, pieces: [{ nom: 'S', L: 5, l: 5 }] }], { ...params, planFlags: {} }).totaux.fondation
    assert.deepEqual(a, b)
  })
  test('aucune fondation lue : rien n\'est déduit d\'une ville', () => {
    const e3 = consolider([lec('plan', { nom: 'RDC', pieces: [{ nom: 'S', L: 4, l: 4 }], confiance: 'haute' })])
    assert.equal(extractionToProject(e3).patchParams.fondation, undefined)
  })
})

describe('Plan d\'amélioration : niveaux, drapeaux de lecture, couverture', () => {
  test('« Niveau 1 », « 1er étage », « N+1 » et « R+1 » désignent le même niveau (pas de double comptage)', () => {
    for (const nom of ['Niveau 1', '1er étage', 'Premier étage', 'N+1', 'Étage 1', 'R+1']) assert.equal(cleNiveau(nom), 'r+1', nom)
    assert.equal(cleNiveau('Niveau 0'), 'rdc')
    assert.equal(cleNiveau('Deuxième étage'), 'r+2')
  })

  test('deux vues du même étage nommées différemment ne donnent qu\'un niveau', () => {
    const ex = consolider([
      lec('plan', { nom: 'R+1', pieces: [{ nom: 'Ch', L: 4, l: 3 }], murs: [] }),
      lec('coffrage', { niveau: 'Étage 1', poteaux: [{ nom: 'P1', nb: 4, a: 0.2, b: 0.2, H: 3 }] }),
    ])
    assert.equal(ex.niveaux.length, 1)
  })

  test('plan de fondation lu sans profondeur : drapeaux fondationLue / profondeurFouilleLue', () => {
    const ex = consolider([
      lec('plan', { nom: 'RDC', pieces: [{ nom: 'S', L: 5, l: 4 }] }),
      lec('fondation', { detectee: true, type: 'filante', filante: { largeur: 0.5, hauteur: 0.25, lineaire: null }, profondeurFouille: null }),
    ])
    const { patchParams } = extractionToProject(ex)
    assert.equal(patchParams.planFlags.fondationLue, true)
    assert.equal(patchParams.planFlags.profondeurFouilleLue, false)
    const r = metrerProjet(extractionToProject(ex).levels, { ...PARAMS_DEFAUT, ...patchParams, fondation: { ...FONDATION_DEFAUT, ...patchParams.fondation } })
    assert.ok(r.couverture.aConfirmer.some((x) => x.cle === 'profondeur_fouille' && x.etat === 'a_confirmer'))
    assert.ok(!r.couverture.aConfirmer.some((x) => x.cle === 'fondation'), 'fondation lue : pas de question « valeurs par défaut »')
  })

  test('type de plancher supposé faute de lecture : marqué « défaut » et soumis à confirmation', () => {
    const ex = consolider([
      lec('plan', { nom: 'RDC', pieces: [{ nom: 'S', L: 5, l: 4 }], surfPlancher: 20 }),
      lec('plan', { nom: 'R+1', pieces: [{ nom: 'S', L: 5, l: 4 }], surfPlancher: 20 }),
    ])
    const { levels, patchParams } = extractionToProject(ex)
    assert.ok(levels.every((l) => l.plancherSource === 'defaut'))
    const r = metrerProjet(levels, { ...PARAMS_DEFAUT, ...patchParams })
    assert.ok(r.couverture.aConfirmer.some((x) => x.cle === 'plancher_type'))
  })

  test('plancher lu sur la poutraison : pas de question sur le type', () => {
    const ex = consolider([
      lec('plan', { nom: 'RDC', pieces: [{ nom: 'S', L: 5, l: 4 }], surfPlancher: 20 }),
      lec('poutraison', { niveau: 'RDC', poutres: [], plancher: { hourdis: 16, compression: 4 } }),
    ])
    const { levels, patchParams } = extractionToProject(ex)
    assert.equal(levels[0].plancherSource, 'lu')
    const r = metrerProjet(levels, { ...PARAMS_DEFAUT, ...patchParams })
    assert.ok(!r.couverture.aConfirmer.some((x) => x.cle === 'plancher_type'))
  })
})

describe('Maquette IFC : une seule source par sujet (pas de double comptage)', () => {
  const ifc = (extra = {}) => lec('plan', {
    nom: 'RDC', source: 'ifc', HSP: 3, surfPlancher: 80, epDalle: 0.15, confiance: 'haute',
    murs: [{ nom: 'M1', type: 'agglo20', L: 10, H: 3, position: 'exterieur', portes: 1, fenetres: 0 }],
    poteaux: [{ nom: 'Poteaux 0.2×0.3', nb: 2, a: 0.2, b: 0.3, H: 3 }], poutres: [], ...extra,
  }, { typeDepose: 'ifc' })
  const pdf = () => lec('plan', {
    nom: 'RDC', HSP: null, surfPlancher: null,
    pieces: [{ nom: 'Salon', L: 8, l: 10 }],
    murs: [{ nom: 'M1 pdf', type: 'agglo15', L: 10, H: 3, position: 'exterieur', portes: 1, fenetres: 0 }],
    poteaux: [{ nom: 'P', nb: 2, a: 0.2, b: 0.3, H: 3 }],
  })

  test('IFC + PDF du même niveau : les murs et poteaux du PDF ne s\'ajoutent pas à ceux de l\'IFC', () => {
    const ex = consolider([pdf(), ifc()])   // l'ordre de lecture ne doit pas compter
    const n = ex.niveaux[0]
    assert.equal(n.murs.length, 1); assert.equal(n.murs[0].nom, 'M1')
    assert.equal(somme(n.poteaux), 2)
    assert.ok(ex.incertitudes.some((m) => /IFC ET sur un plan PDF/.test(m)))
    assert.deepEqual(n._sources, ['ifc', 'plan'])
  })

  test('le PDF complète ce que l\'IFC n\'a pas (pièces, HSP absente)', () => {
    const ex = consolider([pdf(), ifc({ HSP: null })])
    const n = ex.niveaux[0]
    assert.equal(n.pieces.length, 1)
    assert.equal(n.HSP, null)                  // ni l'IFC ni ce PDF ne la donnent : à confirmer
    assert.equal(n.surfPlancher, 80)
  })

  test('de l\'IFC au métré : quantités reprises, épaisseur de dalle transmise', () => {
    const { levels, patchParams } = extractionToProject(consolider([ifc()]))
    assert.equal(levels[0].epDalle, 0.15)
    assert.equal(levels[0].murs[0].type, 'agglo20')
    const r = metrerProjet(levels, { ...PARAMS_DEFAUT, ...patchParams })
    proche(r.totaux.Smur, 30 - 0.9 * 2.1)
    assert.equal(r.totaux.volPoteaux, 0.36)
  })

  test('un PDF seul garde son comportement habituel', () => {
    const n = consolider([pdf()]).niveaux[0]
    assert.equal(n.murs.length, 1); assert.equal(n.murs[0].nom, 'M1 pdf')
  })
})
const somme = (l) => l.reduce((s, x) => s + (x.nb || 1), 0)
