// src/lib/planmerge.js
// Consolidation des lectures par type de plan → une seule extraction à vérifier,
// puis conversion de l'extraction VALIDÉE en niveaux + paramètres pour le moteur.
//
// Module pur (aucune dépendance navigateur) : testable sous Node.
// Principe inchangé : on ne calcule aucune quantité ici. On range les données
// brutes lues sur chaque type de plan à leur place dans le modèle du moteur
// (niveaux, fondation, plans.plomberie / électricité / toiture) et on remonte
// toute divergence entre plans comme incertitude à vérifier.

const n0 = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? '' : +v)
const arr = (v) => (Array.isArray(v) ? v : [])
const sansAccent = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const somNb = (l) => arr(l).reduce((s, x) => s + (Number(x?.nb) > 0 ? Number(x.nb) : 1), 0)
const RANG_CONF = { haute: 0, moyenne: 1, basse: 2 }

// ── Niveaux : clé de rapprochement entre plans (RDC, R+1…) ──────────────────
export function cleNiveau(nom) {
  const s = sansAccent(nom).toLowerCase().trim()
  if (!s) return 'niveau'
  if (/sous[\s-]?sol/.test(s)) return 'ss'
  if (/\b(rdc|rez)\b|rez[\s-]?de[\s-]?chauss|r\s*\+\s*0\b|niveau\s*0\b/.test(s)) return 'rdc'
  let m = s.match(/r\s*\+\s*(\d+)/)
  if (m) return `r+${+m[1]}`
  m = s.match(/(\d+)\s*(?:er|e|eme|ere)?\s*etage/) || s.match(/etage\s*(\d+)/)
  if (m) return `r+${+m[1]}`
  if (/\betage\b/.test(s)) return 'r+1'
  if (/terrasse|toiture|combles/.test(s)) return 'terrasse'
  return s.replace(/\s+/g, ' ')
}
const ordreNiveau = (cle) => (cle === 'ss' ? -1 : cle === 'rdc' ? 0 : /^r\+(\d+)$/.test(cle) ? +cle.slice(2) : cle === 'terrasse' ? 900 : 500)

/**
 * Composition de plancher à corps creux « (16+4) » → type du moteur.
 * Le moteur connaît 15+5 et 20+5 : toute autre composition est assimilée au plus
 * proche (≤ 17 cm de hourdis → 15+5, sinon 20+5) et signalée comme telle.
 */
export function typePlancherDepuisComposition(hourdis, compression) {
  const h = Number(hourdis), c = Number(compression)
  if (!(h > 0)) return null
  const type = h <= 17 ? 'hourdis15' : 'hourdis20'
  const exact = (type === 'hourdis15' && h === 15 && c === 5) || (type === 'hourdis20' && h === 20 && c === 5)
  return { type, exact }
}

// ── Normalisation vers le modèle interne du moteur ──────────────────────────
export function normPiece(p) {
  return { nom: p.nom || 'Pièce', L: n0(p.L), l: n0(p.l), H: '', portes: n0(p.portes) || '', fenetres: n0(p.fenetres) || '', confiance: p.confiance || 'basse' }
}
export function normMur(m) {
  const type = ['brique10', 'agglo10', 'agglo15', 'agglo20'].includes(m.type) ? m.type : 'agglo15'
  return {
    nom: m.nom || 'Mur', type, nb: 1,
    L: n0(m.L), H: n0(m.H),
    position: ['exterieur', 'interieur', 'mitoyen'].includes(m.position) ? m.position : 'interieur',
    portes: n0(m.portes) || 0, fenetres: n0(m.fenetres) || 0,
    confiance: m.confiance || 'basse',
    _typeInconnu: m.type === 'inconnu',
  }
}
export function normPoteau(pt) {
  return { nom: pt.nom || '', nb: n0(pt.nb) || 1, a: n0(pt.a), b: n0(pt.b), H: n0(pt.H), confiance: pt.confiance || 'basse' }
}
export function normPoutre(pu) {
  return { nom: pu.nom || '', nb: n0(pu.nb) || 1, L: n0(pu.L), b: n0(pu.b), h: n0(pu.h), confiance: pu.confiance || 'basse' }
}
export function normVoile(v) {
  return { nom: v.nom || '', nb: n0(v.nb) || 1, L: n0(v.L), ep: n0(v.ep), H: n0(v.H), confiance: v.confiance || 'basse' }
}
export function normCV(c) {
  return { nom: c.nom || '', nb: n0(c.nb) || 1, a: n0(c.a), b: n0(c.b), H: n0(c.H), confiance: c.confiance || 'basse' }
}
export function normSemelle(s) {
  return { type: s.type || 'S', nb: n0(s.nb) || 1, L: n0(s.L), l: n0(s.l), h: n0(s.h), prof: n0(s.prof), confiance: s.confiance || 'basse' }
}
export function normLineaire(c) {
  return { nom: c.nom || '', nb: n0(c.nb) || 1, L: n0(c.L), b: n0(c.b) || 0.2, h: n0(c.h) || 0.2, confiance: c.confiance || 'basse' }
}

// ── Consolidation ───────────────────────────────────────────────────────────
/**
 * @param {Array<{type: string, data: Object|null, vue?: Object}>} lectures
 *        une entrée par vue lue, déjà routée vers son type de plan
 */
export function consolider(lectures = []) {
  const ex = {
    titre: null, ville: null, confiance: 'haute', incertitudes: [],
    toitTerrasseDetecte: false,
    vues: [], typesLus: {},
    niveaux: [],
    fondations: { detectee: false, type: null, semelles: [], avantPoteaux: [], chainages: [], longrines: [], filante: null, radier: null, proprete: null, banche: null, moellons: null, herisson: false, profondeurFouille: null, prescriptions: [] },
    plomberie: null, electricite: null, toiture: null,
  }
  const inc = (m) => ex.incertitudes.push(m)
  const niv = new Map()
  const slot = (nom) => {
    const cle = cleNiveau(nom)
    if (!niv.has(cle)) niv.set(cle, { cle, nom: nom || 'Niveau', plan: [], coffrage: [], poutraison: [], coupe: null })
    return niv.get(cle)
  }
  const coupes = []
  const longrinesCoffrage = []

  for (const l of lectures) {
    if (l.vue) { ex.vues.push(l.vue); if (l.vue.message) inc(l.vue.message) }
    const { type, data } = l
    if (!type || !data) continue
    ex.typesLus[type] = (ex.typesLus[type] || 0) + 1
    if (data.titre && !ex.titre) ex.titre = data.titre
    if (data.ville && !ex.ville) ex.ville = data.ville
    if (RANG_CONF[data.confiance] > RANG_CONF[ex.confiance]) ex.confiance = data.confiance
    arr(data.incertitudes).forEach(inc)
    if (data.toitTerrasseDetecte) ex.toitTerrasseDetecte = true

    switch (type) {
      case 'plan': slot(data.nom || data.niveau).plan.push(data); break
      case 'coffrage': {
        const ronds = arr(data.poteaux).filter((pt) => pt.forme === 'rond').length
        if (ronds) inc(`${data.niveau || 'Coffrage'} : ${ronds} groupe(s) de poteaux circulaires assimilés à un carré de même côté (le volume est surestimé d'environ 27 %) — corrigez la section équivalente si besoin.`)
        slot(data.niveau || data.nom).coffrage.push(data)
        longrinesCoffrage.push(...arr(data.longrines))
        break
      }
      case 'poutraison': slot(data.niveau || data.nom).poutraison.push(data); break
      case 'coupe': coupes.push(data); break
      case 'fondation': {
        const F = ex.fondations
        if (data.detectee === false) break
        F.detectee = true
        if (data.type && data.type !== 'inconnue' && !F.type) F.type = data.type
        F.semelles.push(...arr(data.semelles))
        F.avantPoteaux.push(...arr(data.avantPoteaux))
        F.chainages.push(...arr(data.chainages))
        F.longrines.push(...arr(data.longrines))
        if (data.filante && !F.filante) F.filante = data.filante
        if (data.radier && !F.radier) F.radier = data.radier
        if (data.proprete && !F.proprete) F.proprete = data.proprete
        if (data.banche && !F.banche) F.banche = data.banche
        if (data.moellons && !F.moellons) F.moellons = data.moellons
        if (data.herisson === true) F.herisson = true
        arr(data.prescriptions).map((x) => String(x ?? '').trim()).filter(Boolean).forEach((x) => { if (!F.prescriptions.includes(x)) F.prescriptions.push(x) })
        if (n0(data.profondeurFouille) !== '' && F.profondeurFouille === null) F.profondeurFouille = +data.profondeurFouille
        break
      }
      case 'plomberie': {
        const P = (ex.plomberie ||= { appareils: [], reseaux: [], regards: [] })
        P.appareils.push(...arr(data.appareils)); P.reseaux.push(...arr(data.reseaux)); P.regards.push(...arr(data.regards))
        break
      }
      case 'electricite': {
        const E = (ex.electricite ||= { elements: [] })
        E.elements.push(...arr(data.elements))
        break
      }
      case 'toiture': {
        const T = (ex.toiture ||= { pente: null, pans: [], L: null, l: null, debord: null, surfaceProjetee: null, faitages: [], noues: [], egouts: [], cheneaux: [] })
        ;['pente', 'L', 'l', 'debord', 'surfaceProjetee'].forEach((k) => { if (T[k] === null && n0(data[k]) !== '') T[k] = +data[k] })
        ;['pans', 'faitages', 'noues', 'egouts', 'cheneaux'].forEach((k) => T[k].push(...arr(data[k])))
        break
      }
      default: break
    }
  }

  // ── Coupe : HSP / épaisseurs par niveau ──
  coupes.forEach((c) => {
    arr(c.niveaux).forEach((cn) => { slot(cn.nom).coupe = { ...(slot(cn.nom).coupe || {}), ...cn } })
    if (n0(c.profondeurFondation) !== '' && ex.fondations.profondeurFouille === null) ex.fondations.profondeurFouille = +c.profondeurFondation
  })

  // ── Niveaux ──
  const cles = [...niv.keys()].sort((a, b) => ordreNiveau(a) - ordreNiveau(b))
  cles.forEach((cle) => {
    const s = niv.get(cle)
    const lib = s.nom
    const plan = s.plan.reduce((acc, p) => ({
      ...acc,
      HSP: acc.HSP ?? p.HSP ?? null,
      surfPlancher: acc.surfPlancher ?? p.surfPlancher ?? null,
      pieces: [...arr(acc.pieces), ...arr(p.pieces)],
      murs: [...arr(acc.murs), ...arr(p.murs)],
      poteaux: [...arr(acc.poteaux), ...arr(p.poteaux)],
      poutres: [...arr(acc.poutres), ...arr(p.poutres)],
    }), {})
    const cof = {
      poteaux: s.coffrage.flatMap((c) => arr(c.poteaux)),
      poutres: s.coffrage.flatMap((c) => [...arr(c.poutres), ...arr(c.consoles).map((k) => ({ ...k, nom: k.nom || 'Console' }))]),
      voiles: s.coffrage.flatMap((c) => arr(c.voiles)),
      dalles: s.coffrage.flatMap((c) => arr(c.dalles)),
      chainagesV: s.coffrage.flatMap((c) => arr(c.chainagesV)),
    }
    const pou = {
      poutres: s.poutraison.flatMap((p) => arr(p.poutres)),
      plancher: s.poutraison.map((p) => p.plancher).find((x) => x && Number(x.hourdis) > 0) || null,
      nervures: s.poutraison.map((p) => p.nervures).find(Boolean) || null,
    }

    // Poteaux : le plan de coffrage fait foi sur la vue en plan (même éléments, lus plus précisément).
    let poteaux = arr(plan.poteaux)
    if (cof.poteaux.length) {
      if (poteaux.length && somNb(poteaux) !== somNb(cof.poteaux)) {
        inc(`${lib} : ${somNb(poteaux)} poteau(x) lus sur la vue en plan, ${somNb(cof.poteaux)} sur le plan de coffrage — le coffrage est retenu.`)
      }
      poteaux = cof.poteaux
    }
    // Poutres : coffrage > poutraison > vue en plan (mêmes poutres représentées sur plusieurs plans : pas de double comptage).
    let poutres = arr(plan.poutres)
    if (pou.poutres.length) poutres = pou.poutres
    if (cof.poutres.length) {
      if (pou.poutres.length && somNb(pou.poutres) !== somNb(cof.poutres)) {
        inc(`${lib} : ${somNb(pou.poutres)} poutre(s) lues sur le plan de poutraison, ${somNb(cof.poutres)} sur le plan de coffrage — le coffrage est retenu (poutres jamais comptées deux fois).`)
      }
      poutres = cof.poutres
    }

    // Plancher : poutraison (corps creux) > dalles du coffrage (dalle pleine).
    let plancher, epDalle, surfPlancher = plan.surfPlancher ?? null
    if (pou.plancher) {
      const t = typePlancherDepuisComposition(pou.plancher.hourdis, pou.plancher.compression)
      plancher = t.type
      if (!t.exact) inc(`${lib} : plancher (${pou.plancher.hourdis}+${pou.plancher.compression ?? '?'}) assimilé à « ${t.type === 'hourdis15' ? 'hourdis 15+5' : 'hourdis 20+5'} » — coefficients du moteur à confirmer.`)
      if (cof.dalles.length) inc(`${lib} : dalles lues sur le coffrage ET plancher à corps creux sur la poutraison — le corps creux est retenu, vérifiez.`)
    } else if (cof.dalles.length) {
      // Surface d'un panneau : celle qui est écrite, sinon L × l des deux cotes lues.
      const surfDe = (d) => (Number(d.surface) > 0 ? Number(d.surface) : Number(d.L) > 0 && Number(d.l) > 0 ? Number(d.L) * Number(d.l) : 0)
      const ok = cof.dalles.map((d) => ({ ...d, _s: surfDe(d) })).filter((d) => d._s > 0 && Number(d.ep) > 0)
      const surf = ok.reduce((x, d) => x + d._s, 0)
      if (ok.length && surf > 0) {
        plancher = 'dallePleine'
        // Épaisseur moyenne pondérée par la surface : le volume Σ(Sᵢ × epᵢ) est conservé.
        epDalle = Math.round((ok.reduce((x, d) => x + d._s * Number(d.ep), 0) / surf) * 1000) / 1000
        if (!(Number(surfPlancher) > 0)) surfPlancher = Math.round(surf * 100) / 100
        if (new Set(ok.map((d) => Number(d.ep))).size > 1) inc(`${lib} : dalles d'épaisseurs différentes — épaisseur moyenne pondérée retenue (${epDalle} m).`)
      }
    }
    if (s.coupe && Number(s.coupe.epDalle) > 0 && plancher === 'dallePleine' && epDalle === undefined) epDalle = +s.coupe.epDalle

    // HSP : la coupe fait foi.
    let HSP = plan.HSP ?? null
    const hCoupe = s.coupe && n0(s.coupe.HSP) !== '' ? +s.coupe.HSP : null
    if (hCoupe !== null) {
      if (HSP !== null && Math.abs(HSP - hCoupe) > 0.05) inc(`${lib} : HSP de ${HSP} m lue sur le plan, ${hCoupe} m sur la coupe — la coupe est retenue.`)
      HSP = hCoupe
    }

    const sources = [plan.pieces || plan.murs ? 'plan' : null, s.coffrage.length ? 'coffrage' : null, s.poutraison.length ? 'poutraison' : null, s.coupe ? 'coupe' : null].filter(Boolean)
    ex.niveaux.push({
      nom: lib, cle, HSP, surfPlancher, plancher, epDalle,
      pieces: arr(plan.pieces), murs: arr(plan.murs), poteaux, poutres,
      voiles: cof.voiles, chainagesV: cof.chainagesV,
      nervures: pou.nervures, _sources: sources,
    })
  })

  // Longrines lues sur un coffrage : rattachées à la fondation si elle n'en a pas.
  if (longrinesCoffrage.length) {
    if (!ex.fondations.longrines.length) { ex.fondations.longrines.push(...longrinesCoffrage); ex.fondations.detectee = true; inc('Longrines lues sur un plan de coffrage : rattachées à la fondation.') }
    else inc('Longrines présentes sur le coffrage et sur le plan de fondation — celles du plan de fondation sont retenues.')
  }

  // Aides à la saisie : ce qui manque pour un métré complet
  const avecContenu = ex.niveaux.some((n) => n.pieces.length || n.murs.length || n.poteaux.length || n.poutres.length || n.voiles.length || n.chainagesV.length)
  if (avecContenu && !ex.fondations.detectee) inc("Aucun plan de fondation lu : les semelles/chaînages devront être saisis manuellement dans l'onglet Niveaux & métré.")
  if (avecContenu && !ex.typesLus.coupe && ex.niveaux.some((n) => n.HSP === null)) inc('Aucune coupe lue : les HSP manquantes prendront la valeur par défaut — déposez une coupe pour les lire.')

  controlerBornes(ex)
  return ex
}

/** Bornes physiques : force la confiance à « basse » pour alerter l'utilisateur. */
export function controlerBornes(ex) {
  ex.niveaux.forEach((n) => {
    arr(n.pieces).forEach((p) => { if ((p.L && p.L > 50) || (p.l && p.l > 50)) p.confiance = 'basse' })
    arr(n.murs).forEach((m) => { if ((m.H && (m.H < 0.5 || m.H > 10)) || (m.L && m.L > 100)) m.confiance = 'basse' })
    arr(n.poteaux).forEach((pt) => { if ((pt.a && pt.a > 1) || (pt.b && pt.b > 1) || (pt.H && pt.H > 10)) pt.confiance = 'basse' })
    arr(n.poutres).forEach((pu) => { if ((pu.b && pu.b > 1) || (pu.h && pu.h > 1.5) || (pu.L && pu.L > 30)) pu.confiance = 'basse' })
    arr(n.voiles).forEach((v) => { if ((v.ep && v.ep > 0.6) || (v.L && v.L > 50) || (v.H && v.H > 10)) v.confiance = 'basse' })
    arr(n.chainagesV).forEach((c) => { if ((c.a && c.a > 0.5) || (c.b && c.b > 0.5)) c.confiance = 'basse' })
  })
  arr(ex.fondations?.semelles).forEach((s) => { if ((s.L && s.L > 5) || (s.l && s.l > 5) || (s.h && s.h > 2)) s.confiance = 'basse' })
  arr(ex.plomberie?.reseaux).forEach((r) => { if ((r.diam && r.diam > 300) || (r.L && r.L > 200)) r.confiance = 'basse' })
  if (ex.toiture && ex.toiture.pente !== null && ex.toiture.pente > 150) ex.incertitudes.push(`Plan de toiture : pente de ${ex.toiture.pente} % inhabituelle — vérifiez qu'elle est bien exprimée en %.`)
}

/** Vrai si la consolidation ne contient rien d'exploitable. */
export function estVide(ex) {
  const niveaux = ex.niveaux.some((n) => n.pieces.length || n.murs.length || n.poteaux.length || n.poutres.length || n.voiles.length || n.chainagesV.length || n.plancher)
  const fond = ex.fondations.detectee && (ex.fondations.semelles.length || ex.fondations.avantPoteaux.length || ex.fondations.banche || ex.fondations.moellons || ex.fondations.herisson || ex.fondations.prescriptions.length || ex.fondations.chainages.length || ex.fondations.longrines.length || ex.fondations.filante || ex.fondations.radier)
  const pl = ex.plomberie && (ex.plomberie.appareils.length || ex.plomberie.reseaux.length)
  const el = ex.electricite && ex.electricite.elements.length
  const to = ex.toiture && (ex.toiture.pente !== null || ex.toiture.pans.length || ex.toiture.surfaceProjetee !== null || ex.toiture.faitages.length)
  const coupeSeule = ex.niveaux.some((n) => n.HSP !== null)
  return !(niveaux || fond || pl || el || to || coupeSeule)
}

/**
 * Convertit une extraction VALIDÉE par l'utilisateur (écran « Vérifier la lecture »)
 * en niveaux + correctifs de paramètres pour le moteur.
 */
export function extractionToProject(ex) {
  const nivs = ex.niveaux || []
  const iRez = Math.max(0, nivs.findIndex((n) => cleNiveau(n.nom) === 'rdc'))
  const levels = nivs.map((n, i) => ({
    nom: n.nom || `Niveau ${i}`,
    rez: i === iRez,
    HSP: n0(n.HSP) || '',
    surfPlancher: n0(n.surfPlancher) || '',
    tremies: '',
    plancher: n.plancher || (nivs.length === 1 ? 'dallePleine' : 'hourdis15'),
    ...(n0(n.epDalle) !== '' ? { epDalle: +n.epDalle } : {}),
    pieces: arr(n.pieces).map(normPiece),
    murs: arr(n.murs).map(normMur),
    poteaux: arr(n.poteaux).map(normPoteau),
    poutres: arr(n.poutres).map(normPoutre),
    voiles: arr(n.voiles).map(normVoile),
    chainagesV: arr(n.chainagesV).map(normCV),
  }))

  const patchParams = {
    planFlags: {
      toitTerrasseDetecte: !!ex.toitTerrasseDetecte, typesLus: { ...(ex.typesLus || {}) },
      // Prescriptions écrites sur le plan de fondation (sol d'assise attendu, eau, remblai…) :
      // affichées à l'utilisateur, jamais interprétées par le moteur.
      prescriptionsFondation: arr(ex.fondations?.prescriptions),
    },
  }
  if (ex.toitTerrasseDetecte) patchParams.toiture = 'terrasse'

  const aDesPoteaux = levels.some((lv) => lv.poteaux.length || lv.poutres.length || lv.voiles.length)
  if (levels.length) patchParams.systeme = aDesPoteaux ? 'ossature' : 'murs'

  // ── Fondations ──
  const fd = ex.fondations || {}
  if (fd.detectee) {
    const f = {
      type: ['filante', 'isolees', 'radier'].includes(fd.type) ? fd.type : (arr(fd.semelles).length ? 'isolees' : 'filante'),
      semelles: arr(fd.semelles).map(normSemelle),
      avantPoteaux: arr(fd.avantPoteaux).map((a) => ({ nom: a.nom || '', nb: n0(a.nb) || 1, a: n0(a.a), b: n0(a.b), H: n0(a.H), confiance: a.confiance || 'basse' })),
      chainages: arr(fd.chainages).map(normLineaire),
      longrines: arr(fd.longrines).map(normLineaire),
    }
    if (fd.filante) {
      if (n0(fd.filante.largeur) !== '') f.semL = +fd.filante.largeur
      if (n0(fd.filante.hauteur) !== '') f.semH = +fd.filante.hauteur
      if (n0(fd.filante.lineaire) !== '' && +fd.filante.lineaire > 0) f.lineaire = +fd.filante.lineaire
    }
    if (fd.radier && n0(fd.radier.ep) !== '') f.epRadier = +fd.radier.ep
    if (fd.proprete && n0(fd.proprete.ep) !== '') f.epProprete = +fd.proprete.ep
    if (n0(fd.profondeurFouille) !== '' && +fd.profondeurFouille > 0) f.profFouille = +fd.profondeurFouille
    // Ouvrages associés : activés seulement si le plan les montre (jamais par défaut)
    if (fd.banche && (n0(fd.banche.b) !== '' || n0(fd.banche.h) !== '')) f.banche = { actif: true, ...(n0(fd.banche.b) !== '' ? { b: +fd.banche.b } : {}), ...(n0(fd.banche.h) !== '' ? { h: +fd.banche.h } : {}) }
    if (fd.moellons && (n0(fd.moellons.b) !== '' || n0(fd.moellons.h) !== '')) f.moellons = { actif: true, ...(n0(fd.moellons.b) !== '' ? { b: +fd.moellons.b } : {}), ...(n0(fd.moellons.h) !== '' ? { h: +fd.moellons.h } : {}) }
    if (fd.herisson) f.herisson = { actif: true, surface: null }
    patchParams.fondation = f
  }

  // ── Plans spécialisés : données brutes validées, calculées par le moteur ──
  const plans = {}
  if (ex.plomberie) {
    plans.plomberie = {
      appareils: arr(ex.plomberie.appareils).map((a) => ({ type: a.type || '', nb: n0(a.nb) || 1, piece: a.piece || '' })),
      reseaux: arr(ex.plomberie.reseaux).map((r) => ({ reseau: r.reseau || '', diam: n0(r.diam), L: n0(r.L), pente: n0(r.pente), nom: r.nom || '' })),
      regards: arr(ex.plomberie.regards).map((r) => ({ nom: r.nom || '', nb: n0(r.nb) || 1 })),
    }
  }
  if (ex.electricite) {
    plans.electricite = {
      elements: arr(ex.electricite.elements).map((e) => ({ type: e.type || '', nb: n0(e.nb) || 1, piece: e.piece || '', repere: e.repere || '' })),
    }
  }
  if (ex.toiture) {
    const lst = (k) => arr(ex.toiture[k]).map((x) => ({ nom: x.nom || '', L: n0(x.L) }))
    plans.toiture = {
      pente: n0(ex.toiture.pente), L: n0(ex.toiture.L), l: n0(ex.toiture.l), debord: n0(ex.toiture.debord), surfaceProjetee: n0(ex.toiture.surfaceProjetee),
      pans: arr(ex.toiture.pans).map((p) => ({ nom: p.nom || '', pente: n0(p.pente), surface: n0(p.surface) })),
      faitages: lst('faitages'), noues: lst('noues'), egouts: lst('egouts'), cheneaux: lst('cheneaux'),
    }
  }
  if (Object.keys(plans).length) patchParams.plans = plans

  return { levels, patchParams }
}
