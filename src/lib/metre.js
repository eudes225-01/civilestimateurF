// src/lib/metre.js
// Moteur de calcul v2 — formules déterministes du Guide du métré (Bénin §5–6).
// Refonte suite au rapport d'insuffisances (test R+2 Fès, juillet 2026) :
//   A1  Systèmes de fondation : filante / semelles isolées + longrines / radier,
//       modélisés comme des LISTES D'ÉLÉMENTS (+ pleine masse, banché, moellons,
//       arase, hérissonnage, remblai).
//   A2  Structure poteaux-poutres (ossature) + linteaux générés depuis les ouvertures.
//   A3  Plancher PAR NIVEAU : dalle pleine / hourdis 15+5 / hourdis 20+5 /
//       dalle sur terre-plein, avec surface propre et déduction des trémies.
//   A4  HSP par niveau + murs typés (brique 10 / agglos 10 / 15 / 20).
//   A5  Ratios d'acier PAR ÉLÉMENT (plus de constante unique 90 kg/m³).
//   A6  Enduits intérieur / extérieur calculés par face de mur, déduction
//       ouverture par ouverture.
//   A7  Passe de validations croisées → alertes[] (jamais silencieux).
//   A9  Traçabilité : chaque total conserve son détail par élément (detail[]).
// Source de vérité partagée avec backend/lib/metre.js (générée depuis ce fichier).
// Les ratios acier vivent dans ../constants/ratiosAcier.js et la passe de
// validation croisée dans ./validation.js — réexportés/appelés ci-dessous
// pour ne rien changer côté composants.

import { ACIER, RATIOS_ACIER_DEFAUT } from '../constants/ratiosAcier.js'
import { validerCoherence } from './validation.js'

// Réexportées telles quelles : les composants existants (App.jsx, TabNiveaux.jsx…)
// importent ACIER / RATIOS_ACIER_DEFAUT depuis lib/metre.js.
export { ACIER, RATIOS_ACIER_DEFAUT }

export const TVA = 0.18
const round2 = (n) => Math.round((n || 0) * 100) / 100
const num = (v, d = 0) => (v === '' || v === null || v === undefined || isNaN(+v) ? d : +v)

// ── Types de murs (A4) ─────────────────────────────────────────────────────
export const TYPES_MUR = {
  brique10: { lab: 'Cloison brique creuse 10', ep: 0.10, code: 'mur_brique10', blocsM2: 16.7, pertesKey: 'pertesBrique' },
  agglo10:  { lab: 'Agglos creux 10',           ep: 0.10, code: 'mur_agglo10',  blocsM2: 12.5, pertesKey: 'pertesAgglo'  },
  agglo15:  { lab: 'Agglos creux 15',           ep: 0.15, code: '6019…2241',    blocsM2: 12.5, pertesKey: 'pertesAgglo'  },
  agglo20:  { lab: 'Agglos creux 20 (porteur)', ep: 0.20, code: 'mur_agglo20',  blocsM2: 12.5, pertesKey: 'pertesAgglo'  },
}
const MURS_PORTEURS = ['agglo15', 'agglo20']

// ── Types de plancher par niveau (A3) ──────────────────────────────────────
export const TYPES_PLANCHER = {
  aucun:       { lab: 'Aucun plancher haut',         code: null },
  dallePleine: { lab: 'Dalle pleine BA',             code: '6019…2376' },
  hourdis15:   { lab: 'Hourdis 15+5 (corps creux)',  code: 'plancher_h15', betonM2: 0.080, entrevousM2: 8.5 },
  hourdis20:   { lab: 'Hourdis 20+5 (corps creux)',  code: 'plancher_h20', betonM2: 0.095, entrevousM2: 7.0 },
  dalleTP:     { lab: 'Dalle sur terre-plein',       code: 'dalle_tp' },
}

// ── Toitures ────────────────────────────────────────────────────────────────
export const TOITURES = {
  bac:      { lab: 'Tôle bac aluzinc + charpente bois', coef: 1.15, code: 'toit_bac',      pente: '2 pans, ~30°' },
  tuiles:   { lab: 'Tuiles + charpente bois',           coef: 1.30, code: 'toit_tuiles',   pente: '4 pans, ~35°' },
  shingle:  { lab: 'Bardeaux bitumés (shingle)',        coef: 1.20, code: 'toit_shingle',  pente: '2 pans, ~30°' },
  terrasse: { lab: 'Toit-terrasse (étanchéité)',        coef: 1.00, code: 'toit_terrasse', pente: 'Plat / accessible' },
}

// ── Systèmes (A1 / A2) ──────────────────────────────────────────────────────
export const SYSTEMES_FONDATION = {
  filante: { lab: 'Semelle filante sous murs porteurs' },
  isolees: { lab: 'Semelles isolées + chaînages / longrines' },
  radier:  { lab: 'Radier général' },
}
export const SYSTEMES_CONSTRUCTIFS = {
  murs:     { lab: 'Murs porteurs + chaînage' },
  ossature: { lab: 'Ossature poteaux-poutres' },
  mixte:    { lab: 'Mixte (murs porteurs + poteaux)' },
}

export const FONDATION_DEFAUT = {
  type: 'filante',
  semL: 0.40, semH: 0.20, profFouille: 0.60, epProprete: 0.05, lineaire: null,
  pleineMasse: { actif: false, surface: null, prof: 0.50 },
  semelles: [],      // { type:'S1', nb, L, l, h, prof, Lba, lba }
  avantPoteaux: [],  // { nb, a, b, H }
  chainages: [],     // { nom, nb, L, b, h, prof, bF }  (b×h = section BA)
  longrines: [],     // { nom, nb, L, b, h, prof, bF }
  banche:   { actif: false, b: 0.40, h: 0.95 },   // gros béton banché sous longrines
  moellons: { actif: false, b: 0.50, h: 1.25 },   // maçonnerie de moellons sous chaînages
  arase: true,
  herisson: { actif: false, surface: null },
  epRadier: 0.30,
}

export const PARAMS_DEFAUT = {
  systeme: 'murs',
  Hetage: 3, epDalle: 0.15, K: 1.30, toiture: 'bac',
  pertesAgglo: 7, pertesBrique: 8,
  ratiosAcier: { ...RATIOS_ACIER_DEFAUT },
  linteau: { b: 0.20, h: 0.25, appui: 0.20 },
  ouv: { pL: 0.90, pH: 2.10, fL: 1.20, fH: 1.20 },
  emprise: null,
  fondation: { ...FONDATION_DEFAUT },
  planFlags: {},      // renseigné par la lecture de plan (ex : toitTerrasseDetecte)
  faces2: true,       // legacy
}

// ═════════════════════════════════════════════════════════════════════════
// MURS / PIÈCES / ENDUITS  (A4 + A6, traçabilité A9)
// ═════════════════════════════════════════════════════════════════════════

/** Convertit les pièces (mode simple / legacy) en murs implicites agglos 15. */
function mursDepuisPieces(level, p) {
  return (level.pieces || [])
    .filter((pc) => num(pc.L) > 0 && num(pc.l) > 0)
    .map((pc) => ({
      nom: pc.nom || 'Pièce', type: 'agglo15', nb: 1,
      L: round2(2 * (num(pc.L) + num(pc.l))),
      H: num(pc.H) || num(level.HSP) || num(p.Hetage, 3),
      position: 'interieur',
      portes: num(pc.portes), fenetres: num(pc.fenetres),
      _derive: true,
    }))
}

function metrerMurs(level, p) {
  const ouv = p.ouv || PARAMS_DEFAUT.ouv
  const HSP = num(level.HSP) || num(p.Hetage, 3)
  const murs = (level.murs && level.murs.length) ? level.murs : mursDepuisPieces(level, p)

  const parType = {}   // { agglo15: { surf, blocs, detail[] }, … }
  let Ldev = 0, LdevPorteurs = 0, Souv = 0, enduitInt = 0, enduitExt = 0
  let nbPortes = 0, nbFenetres = 0
  const detail = []

  murs.forEach((m) => {
    const t = TYPES_MUR[m.type] ? m.type : 'agglo15'
    const nb = num(m.nb, 1) || 1
    const L = num(m.L), H = num(m.H) || HSP
    if (L <= 0 || H <= 0) return
    const np = num(m.portes), nf = num(m.fenetres)
    const pL = num(m.pL, ouv.pL), pH = num(m.pH, ouv.pH)
    const fL = num(m.fL, ouv.fL), fH = num(m.fH, ouv.fH)
    const sOuv = np * pL * pH + nf * fL * fH
    const brute = nb * L * H
    const nette = Math.max(0, brute - nb * sOuv)

    if (!parType[t]) parType[t] = { surf: 0, blocs: 0, detail: [] }
    parType[t].surf = round2(parType[t].surf + nette)
    parType[t].detail.push({
      lib: m.nom || TYPES_MUR[t].lab,
      formule: `${nb} × ${L} × ${H}${sOuv ? ` − ${round2(nb * sOuv)} (ouv.)` : ''}`,
      q: round2(nette), u: 'm²',
    })

    Ldev += nb * L
    if (MURS_PORTEURS.includes(t)) LdevPorteurs += nb * L
    Souv += nb * sOuv
    nbPortes += nb * np; nbFenetres += nb * nf

    // Enduits par face (A6)
    const pos = m.position || 'interieur'
    if (pos === 'exterieur') { enduitExt += nette; enduitInt += nette }
    else if (pos === 'mitoyen') { enduitInt += nette }
    else { enduitInt += 2 * nette }

    detail.push({ ...m, type: t, surfNette: round2(nette) })
  })

  // Blocs par type, avec pertes par matériau
  Object.entries(parType).forEach(([t, v]) => {
    const inf = TYPES_MUR[t]
    const pertes = 1 + num(p[inf.pertesKey], inf.pertesKey === 'pertesBrique' ? 8 : 7) / 100
    v.blocs = Math.round(v.surf * inf.blocsM2 * pertes)
  })

  const Smur = round2(Object.values(parType).reduce((s, v) => s + v.surf, 0))
  return {
    murs: detail, parType,
    Ldev: round2(Ldev), LdevPorteurs: round2(LdevPorteurs),
    Smur, Souv: round2(Souv),
    enduitInt: round2(enduitInt), enduitExt: round2(enduitExt),
    nbPortes, nbFenetres, HSP,
  }
}

/** Linteaux générés automatiquement depuis les ouvertures (A2). */
function metrerLinteaux(mursInfo, p) {
  const lt = p.linteau || PARAMS_DEFAUT.linteau
  const ouv = p.ouv || PARAMS_DEFAUT.ouv
  const detail = []
  let vol = 0
  mursInfo.murs.forEach((m) => {
    const nb = num(m.nb, 1) || 1
    const np = num(m.portes) * nb, nf = num(m.fenetres) * nb
    if (np > 0) {
      const L = num(m.pL, ouv.pL) + 2 * lt.appui
      const v = round2(np * L * lt.b * lt.h)
      vol += v
      detail.push({ lib: `Linteaux portes — ${m.nom || 'mur'}`, formule: `${np} × ${round2(L)} × ${lt.b} × ${lt.h}`, q: v, u: 'm³' })
    }
    if (nf > 0) {
      const L = num(m.fL, ouv.fL) + 2 * lt.appui
      const v = round2(nf * L * lt.b * lt.h)
      vol += v
      detail.push({ lib: `Linteaux fenêtres — ${m.nom || 'mur'}`, formule: `${nf} × ${round2(L)} × ${lt.b} × ${lt.h}`, q: v, u: 'm³' })
    }
  })
  return { vol: round2(vol), detail }
}

// ═════════════════════════════════════════════════════════════════════════
// NIVEAU  (murs + ossature + plancher propre au niveau — A2 / A3)
// ═════════════════════════════════════════════════════════════════════════

function metrerNiveau(level, p = {}) {
  const mursInfo = metrerMurs(level, p)
  const HSP = mursInfo.HSP

  // Surface du niveau : surfPlancher saisie > somme des pièces
  const surfPieces = round2((level.pieces || []).reduce((s, pc) => s + num(pc.L) * num(pc.l), 0))
  const surfNiveau = num(level.surfPlancher) > 0 ? num(level.surfPlancher) : surfPieces
  const tremies = Math.max(0, num(level.tremies))
  const surfPlancherNette = Math.max(0, round2(surfNiveau - tremies))

  // ── Ossature (A2) ──
  const detPoteaux = []
  let volPoteaux = 0
  ;(level.poteaux || []).forEach((pt) => {
    const nb = num(pt.nb, 1) || 1, a = num(pt.a), b = num(pt.b), H = num(pt.H) || HSP
    if (a <= 0 || b <= 0) return
    const v = round2(nb * a * b * H)
    volPoteaux += v
    detPoteaux.push({ lib: pt.nom || `Poteaux ${a}×${b}`, formule: `${nb} × ${a} × ${b} × ${H}`, q: v, u: 'm³' })
  })
  const detPoutres = []
  let volPoutres = 0
  ;(level.poutres || []).forEach((pu) => {
    const nb = num(pu.nb, 1) || 1, L = num(pu.L), b = num(pu.b), h = num(pu.h)
    if (L <= 0 || b <= 0 || h <= 0) return
    const v = round2(nb * L * b * h)
    volPoutres += v
    detPoutres.push({ lib: pu.nom || `Poutres ${b}×${h}`, formule: `${nb} × ${L} × ${b} × ${h}`, q: v, u: 'm³' })
  })

  const linteaux = metrerLinteaux(mursInfo, p)

  // ── Plancher haut du niveau (A3) ──
  // Compat legacy : level.dalle=true (ancien modèle) → dalle pleine.
  const typePl = level.plancher || (level.dalle ? 'dallePleine' : 'aucun')
  const plInfo = TYPES_PLANCHER[typePl] || TYPES_PLANCHER.aucun
  let volPlancher = 0, surfHourdis = 0, entrevous = 0, acierPlancher = 0
  const R = { ...RATIOS_ACIER_DEFAUT, ...(p.ratiosAcier || {}) }
  if (typePl === 'dallePleine') {
    volPlancher = round2(surfPlancherNette * num(level.epDalle, num(p.epDalle, 0.15)))
    acierPlancher = Math.round(volPlancher * R.dallePleine)
  } else if (typePl === 'dalleTP') {
    volPlancher = round2(surfPlancherNette * num(level.epDalle, num(p.epDalle, 0.12)))
    acierPlancher = Math.round(volPlancher * R.dalleTP)
  } else if (typePl === 'hourdis15' || typePl === 'hourdis20') {
    surfHourdis = surfPlancherNette
    volPlancher = round2(surfPlancherNette * plInfo.betonM2)
    entrevous = Math.round(surfPlancherNette * plInfo.entrevousM2)
    acierPlancher = Math.round(surfPlancherNette * R.hourdisM2)
  }

  const mortierPose = round2(mursInfo.Smur * 0.022)

  return {
    nom: level.nom, HSP,
    Ldev: mursInfo.Ldev, LdevPorteurs: mursInfo.LdevPorteurs,
    Ssol: surfPieces, surfPlancher: surfPlancherNette, tremies,
    Smur: mursInfo.Smur, Souv: mursInfo.Souv,
    parTypeMur: mursInfo.parType,
    enduitInt: mursInfo.enduitInt, enduitExt: mursInfo.enduitExt,
    nbPortes: mursInfo.nbPortes, nbFenetres: mursInfo.nbFenetres,
    mortierPose,
    volPoteaux: round2(volPoteaux), volPoutres: round2(volPoutres),
    volLinteaux: linteaux.vol,
    typePlancher: typePl, volPlancher, surfHourdis, entrevous, acierPlancher,
    detail: { poteaux: detPoteaux, poutres: detPoutres, linteaux: linteaux.detail },
  }
}

// ═════════════════════════════════════════════════════════════════════════
// FONDATIONS  (A1) — trois systèmes, modélisés par éléments
// ═════════════════════════════════════════════════════════════════════════

function metrerFondation(fRaw = {}, ctx = {}) {
  const f = { ...FONDATION_DEFAUT, ...fRaw,
    pleineMasse: { ...FONDATION_DEFAUT.pleineMasse, ...(fRaw.pleineMasse || {}) },
    banche: { ...FONDATION_DEFAUT.banche, ...(fRaw.banche || {}) },
    moellons: { ...FONDATION_DEFAUT.moellons, ...(fRaw.moellons || {}) },
    herisson: { ...FONDATION_DEFAUT.herisson, ...(fRaw.herisson || {}) },
  }
  const out = {
    type: f.type,
    volPleineMasse: 0, volFouilles: 0, volProprete: 0,
    volBAsemelles: 0, volBAavantPoteaux: 0, volBAchainages: 0, volBAlongrines: 0, volBAradier: 0,
    volBanche: 0, volMoellons: 0, surfArase: 0, surfHerisson: 0, volRemblai: 0,
    lineaireFonde: 0,
    detail: { fouilles: [], proprete: [], ba: [], divers: [] },
  }
  const emprise = num(ctx.emprise)

  // Fouille en pleine masse (commune, optionnelle)
  if (f.pleineMasse.actif) {
    const S = num(f.pleineMasse.surface) > 0 ? num(f.pleineMasse.surface) : emprise
    out.volPleineMasse = round2(S * num(f.pleineMasse.prof, 0.5))
    out.detail.fouilles.push({ lib: 'Fouille en pleine masse', formule: `${round2(S)} × ${f.pleineMasse.prof}`, q: out.volPleineMasse, u: 'm³' })
  }

  if (f.type === 'radier') {
    const S = emprise
    out.volBAradier = round2(S * num(f.epRadier, 0.3))
    out.volProprete = round2(S * num(f.epProprete, 0.05))
    out.volFouilles = round2(S * num(f.profFouille, 0.6))
    out.detail.fouilles.push({ lib: 'Fouille sous radier', formule: `${round2(S)} × ${f.profFouille}`, q: out.volFouilles, u: 'm³' })
    out.detail.ba.push({ lib: 'Radier général BA', formule: `${round2(S)} × ${f.epRadier}`, q: out.volBAradier, u: 'm³' })
  } else if (f.type === 'isolees') {
    // Semelles isolées
    ;(f.semelles || []).forEach((s) => {
      const nb = num(s.nb, 1) || 1, L = num(s.L), l = num(s.l)
      if (L <= 0 || l <= 0) return
      const prof = num(s.prof, num(f.profFouille, 1.5))
      const h = num(s.h, num(f.semH, 0.3))
      const vF = round2(nb * L * l * prof)
      const Lba = num(s.Lba, L), lba = num(s.lba, l)
      const vBA = round2(nb * Lba * lba * h)
      const vBP = round2(nb * L * l * num(f.epProprete, 0.1))
      out.volFouilles += vF; out.volBAsemelles += vBA; out.volProprete += vBP
      const tag = s.type ? ` ${s.type}` : ''
      out.detail.fouilles.push({ lib: `Fouille semelles${tag}`, formule: `${nb} × ${L} × ${l} × ${prof}`, q: vF, u: 'm³' })
      out.detail.ba.push({ lib: `BA semelles${tag}`, formule: `${nb} × ${Lba} × ${lba} × ${h}`, q: vBA, u: 'm³' })
      out.detail.proprete.push({ lib: `Propreté semelles${tag}`, formule: `${nb} × ${L} × ${l} × ${f.epProprete}`, q: vBP, u: 'm³' })
    })
    // Avant-poteaux
    ;(f.avantPoteaux || []).forEach((ap) => {
      const nb = num(ap.nb, 1) || 1, a = num(ap.a), b = num(ap.b), H = num(ap.H)
      if (a <= 0 || b <= 0 || H <= 0) return
      const v = round2(nb * a * b * H)
      out.volBAavantPoteaux += v
      out.detail.ba.push({ lib: 'BA avant-poteaux', formule: `${nb} × ${a} × ${b} × ${H}`, q: v, u: 'm³' })
    })
    // Chaînages / longrines : fouilles (rigoles) + BA + ouvrages associés
    const rigole = (lst, nomG, bFDef) => {
      let lin = 0
      ;(lst || []).forEach((c) => {
        const nb = num(c.nb, 1) || 1, L = num(c.L)
        if (L <= 0) return
        lin += nb * L
        const bF = num(c.bF, bFDef)
        const prof = num(c.prof, num(f.profFouille, 1.5))
        const vF = round2(nb * L * bF * prof)
        out.volFouilles += vF
        out.detail.fouilles.push({ lib: `Fouille rigole ${nomG}${c.nom ? ` — ${c.nom}` : ''}`, formule: `${nb} × ${L} × ${bF} × ${prof}`, q: vF, u: 'm³' })
        const vBP = round2(nb * L * bF * num(f.epProprete, 0.1))
        out.volProprete += vBP
        out.detail.proprete.push({ lib: `Propreté ${nomG}${c.nom ? ` — ${c.nom}` : ''}`, formule: `${nb} × ${L} × ${bF} × ${f.epProprete}`, q: vBP, u: 'm³' })
        const b = num(c.b, 0.2), h = num(c.h, 0.2)
        const vBA = round2(nb * L * b * h)
        if (nomG === 'chaînage') out.volBAchainages += vBA
        else out.volBAlongrines += vBA
        out.detail.ba.push({ lib: `BA ${nomG}${c.nom ? ` — ${c.nom}` : ''}`, formule: `${nb} × ${L} × ${b} × ${h}`, q: vBA, u: 'm³' })
        // Ouvrages associés
        if (nomG === 'longrine' && f.banche.actif) {
          const vB = round2(nb * L * num(f.banche.b, 0.4) * num(f.banche.h, 0.95))
          out.volBanche += vB
          out.detail.divers.push({ lib: `Béton banché — ${c.nom || 'longrine'}`, formule: `${nb} × ${L} × ${f.banche.b} × ${f.banche.h}`, q: vB, u: 'm³' })
          if (f.arase) out.surfArase += round2(nb * L * num(f.banche.b, 0.4))
        }
        if (nomG === 'chaînage' && f.moellons.actif) {
          const vM = round2(nb * L * num(f.moellons.b, 0.5) * num(f.moellons.h, 1.25))
          out.volMoellons += vM
          out.detail.divers.push({ lib: `Moellons — ${c.nom || 'chaînage'}`, formule: `${nb} × ${L} × ${f.moellons.b} × ${f.moellons.h}`, q: vM, u: 'm³' })
          if (f.arase) out.surfArase += round2(nb * L * num(f.moellons.b, 0.5))
        }
      })
      return lin
    }
    out.lineaireFonde = round2(rigole(f.chainages, 'chaînage', 0.6) + rigole(f.longrines, 'longrine', 0.6))
  } else {
    // ── filante (défaut / legacy) ──
    const lin = num(f.lineaire) > 0 ? num(f.lineaire) : num(ctx.LdevPorteurs)
    const semL = num(f.semL, 0.4), semH = num(f.semH, 0.2), prof = num(f.profFouille, 0.6)
    out.lineaireFonde = round2(lin)
    out.volFouilles = round2(semL * prof * lin)
    out.volProprete = round2(semL * num(f.epProprete, 0.05) * lin)
    out.volBAsemelles = round2(semL * semH * lin)
    out.volBAchainages = round2(0.20 * 0.20 * lin)
    out.detail.fouilles.push({ lib: 'Fouille en rigole (filante)', formule: `${semL} × ${prof} × ${round2(lin)}`, q: out.volFouilles, u: 'm³' })
    out.detail.ba.push({ lib: 'BA semelle filante', formule: `${semL} × ${semH} × ${round2(lin)}`, q: out.volBAsemelles, u: 'm³' })
    out.detail.ba.push({ lib: 'BA chaînage bas', formule: `0,20 × 0,20 × ${round2(lin)}`, q: out.volBAchainages, u: 'm³' })
  }

  // Hérissonnage (commun, optionnel)
  if (f.herisson.actif) {
    out.surfHerisson = round2(num(f.herisson.surface) > 0 ? num(f.herisson.surface) : emprise)
    out.detail.divers.push({ lib: 'Hérissonnage en pierres sèches', formule: `${out.surfHerisson}`, q: out.surfHerisson, u: 'm²' })
  }

  // Remblai / évacuation = fouilles − volumes restant en place
  const enPlace = out.volProprete + out.volBAsemelles + out.volBAavantPoteaux
    + out.volBAchainages + out.volBAlongrines + out.volBAradier + out.volBanche + out.volMoellons
  out.volRemblai = round2(Math.max(0, out.volFouilles + out.volPleineMasse - enPlace))

  out.volFouilles = round2(out.volFouilles)
  out.volProprete = round2(out.volProprete)
  out.volBAsemelles = round2(out.volBAsemelles)
  out.volBAavantPoteaux = round2(out.volBAavantPoteaux)
  out.volBAchainages = round2(out.volBAchainages)
  out.volBAlongrines = round2(out.volBAlongrines)
  out.volBanche = round2(out.volBanche)
  out.volMoellons = round2(out.volMoellons)
  out.surfArase = round2(out.surfArase)
  return out
}

// La passe de validations croisées (A7) vit désormais dans ./validation.js —
// voir l'import de `validerCoherence` en tête de fichier.

// ═════════════════════════════════════════════════════════════════════════
// PROJET  — agrégation + acier par élément (A5) + alertes (A7)
// ═════════════════════════════════════════════════════════════════════════

export function metrerProjet(levels = [], pRaw = {}) {
  const p = { ...PARAMS_DEFAUT, ...pRaw, ratiosAcier: { ...RATIOS_ACIER_DEFAUT, ...(pRaw.ratiosAcier || {}) } }
  const R = p.ratiosAcier

  const parNiveau = levels.map((lv) => metrerNiveau(lv, p))

  // Emprise : paramètre > plus grande surface de niveau
  const emprise = num(p.emprise) > 0 ? num(p.emprise)
    : round2(Math.max(0, ...parNiveau.map((m) => Math.max(m.surfPlancher, m.Ssol)), 0))

  const iRez = Math.max(0, levels.findIndex((lv) => lv?.rez))
  const rez = parNiveau[iRez] || { LdevPorteurs: 0, Ldev: 0 }
  const fondation = metrerFondation(p.fondation, {
    emprise,
    LdevPorteurs: rez.LdevPorteurs || rez.Ldev || 0,
  })

  // ── Agrégats élévation / planchers / maçonnerie ──
  const acc = {
    Ldev: 0, LdevPorteurs: 0, Ssol: 0, Smur: 0, Souv: 0,
    enduitInt: 0, enduitExt: 0, mortierPose: 0,
    volPoteaux: 0, volPoutres: 0, volLinteaux: 0,
    volPlanchers: 0, surfHourdis: 0, entrevous: 0,
    nbPortes: 0, nbFenetres: 0, nbPoteauxTotal: 0,
  }
  const parTypeMur = {}
  const acierDetail = []
  let acierPlanchers = 0

  parNiveau.forEach((m, i) => {
    acc.Ldev = round2(acc.Ldev + m.Ldev)
    acc.LdevPorteurs = round2(acc.LdevPorteurs + m.LdevPorteurs)
    acc.Ssol = round2(acc.Ssol + m.Ssol)
    acc.Smur = round2(acc.Smur + m.Smur)
    acc.Souv = round2(acc.Souv + m.Souv)
    acc.enduitInt = round2(acc.enduitInt + m.enduitInt)
    acc.enduitExt = round2(acc.enduitExt + m.enduitExt)
    acc.mortierPose = round2(acc.mortierPose + m.mortierPose)
    acc.volPoteaux = round2(acc.volPoteaux + m.volPoteaux)
    acc.volPoutres = round2(acc.volPoutres + m.volPoutres)
    acc.volLinteaux = round2(acc.volLinteaux + m.volLinteaux)
    acc.volPlanchers = round2(acc.volPlanchers + m.volPlancher)
    acc.surfHourdis = round2(acc.surfHourdis + m.surfHourdis)
    acc.entrevous += m.entrevous
    acc.nbPortes += m.nbPortes; acc.nbFenetres += m.nbFenetres
    acierPlanchers += m.acierPlancher
    acc.nbPoteauxTotal += (levels[i]?.poteaux || []).reduce((s, x) => s + (num(x.nb, 1) || 1), 0)
    Object.entries(m.parTypeMur).forEach(([tKey, v]) => {
      if (!parTypeMur[tKey]) parTypeMur[tKey] = { surf: 0, blocs: 0, detail: [] }
      parTypeMur[tKey].surf = round2(parTypeMur[tKey].surf + v.surf)
      parTypeMur[tKey].blocs += v.blocs
      parTypeMur[tKey].detail.push(...v.detail.map((d) => ({ ...d, lib: `${m.nom || `Niv. ${i}`} — ${d.lib}` })))
    })
  })
  const nbPoteauxRez = (levels[iRez]?.poteaux || [])
    .reduce((s, x) => s + (num(x.nb, 1) || 1), 0)

  // ── Acier par élément (A5) ──
  const pushAcier = (lib, vol, ratio) => {
    if (vol <= 0) return 0
    const kg = Math.round(vol * ratio)
    acierDetail.push({ lib, formule: `${round2(vol)} m³ × ${ratio} kg/m³`, q: kg, u: 'kg' })
    return kg
  }
  let acierKg = 0
  acierKg += pushAcier('Semelles', fondation.volBAsemelles, R.semelle)
  acierKg += pushAcier('Avant-poteaux', fondation.volBAavantPoteaux, R.poteau)
  acierKg += pushAcier('Chaînages', fondation.volBAchainages, R.chainage)
  acierKg += pushAcier('Longrines', fondation.volBAlongrines, R.longrine)
  acierKg += pushAcier('Radier', fondation.volBAradier, R.radier)
  acierKg += pushAcier('Poteaux', acc.volPoteaux, R.poteau)
  acierKg += pushAcier('Poutres', acc.volPoutres, R.poutre)
  acierKg += pushAcier('Linteaux', acc.volLinteaux, R.linteau)
  if (acierPlanchers > 0) {
    acierKg += acierPlanchers
    acierDetail.push({ lib: 'Planchers (dalles + hourdis)', formule: 'par niveau, selon type', q: acierPlanchers, u: 'kg' })
  }

  // ── Volumes BA totaux ──
  const volBAfondation = round2(fondation.volBAsemelles + fondation.volBAavantPoteaux
    + fondation.volBAchainages + fondation.volBAlongrines + fondation.volBAradier)
  const volBAelevation = round2(acc.volPoteaux + acc.volPoutres + acc.volLinteaux)
  const volBA = round2(volBAfondation + volBAelevation + acc.volPlanchers)

  // ── Toiture ──
  const toitKey = p.toiture && TOITURES[p.toiture] ? p.toiture : 'bac'
  const toit = TOITURES[toitKey]
  const dernier = parNiveau[parNiveau.length - 1]
  const surfToiture = toitKey === 'terrasse'
    ? round2((dernier?.surfPlancher || emprise))
    : round2(emprise * toit.coef)

  // ── Ciment (estimation) ──
  const cimentSacs = Math.round(
    acc.mortierPose * 7 + volBA * 7 + fondation.volProprete * 3
    + (acc.enduitInt + acc.enduitExt) * 0.12 + fondation.volBanche * 4 + fondation.volMoellons * 2.5
  )

  // ── Totaux (avec les anciens champs pour compatibilité de l'export PDF) ──
  const totaux = {
    ...acc,
    parTypeMur,
    emprise,
    fondation,
    LdevPorteursRez: round2(rez.LdevPorteurs || 0),
    volFouille: round2(fondation.volFouilles + fondation.volPleineMasse),
    volPleineMasse: fondation.volPleineMasse,
    volProprete: fondation.volProprete,
    volSemelle: round2(fondation.volBAsemelles + fondation.volBAavantPoteaux),
    volChainageBas: round2(fondation.volBAchainages + fondation.volBAlongrines),
    volBanche: fondation.volBanche,
    volMoellons: fondation.volMoellons,
    surfArase: fondation.surfArase,
    surfHerisson: fondation.surfHerisson,
    volRemblai: fondation.volRemblai,
    volBAfondation, volBAelevation,
    volDalle: acc.volPlanchers,
    volBA,
    acierKg,
    acierDetail,
    agglos: Object.values(parTypeMur).reduce((s, v) => s + v.blocs, 0),
    enduit: round2(acc.enduitInt + acc.enduitExt),
    cimentSacs,
    surfToiture,
    toiture: { key: toitKey, ...toit },
    nbPoteauxRez,
    parNiveau,
    systeme: p.systeme,
  }

  const alertes = validerCoherence(totaux, levels, p, TOITURES)
  return { totaux, parNiveau, alertes }
}

// ═════════════════════════════════════════════════════════════════════════
// DQE  — postes par lots, un prix par type d'ouvrage, détail traçable (A9)
// ═════════════════════════════════════════════════════════════════════════

export function buildDQE(totaux, prixMap = {}, K = 1.30) {
  const px = (k) => prixMap[k] ?? 0
  const t = totaux
  const f = t.fondation || {}
  const lignes = []
  const L = (n, des, u, q, code, detail) => { if (q > 0) lignes.push({ n, des, u, q: round2(q), code, detail }) }

  // 1 — Terrassement
  L('1.1', 'Fouille en pleine masse', 'm³', t.volPleineMasse, 'fouille_pm', (f.detail?.fouilles || []).filter((d) => /pleine masse/i.test(d.lib)))
  L('1.2', 'Fouilles en puits, rigoles ou tranchées', 'm³', f.volFouilles, '6019…1676', (f.detail?.fouilles || []).filter((d) => !/pleine masse/i.test(d.lib)))
  L('1.3', 'Mise en remblai ou évacuation des terres', 'm³', t.volRemblai, 'remblai')

  // 2 — Fondations
  L('2.1', 'Béton de propreté dosé 150 kg/m³', 'm³', t.volProprete, '6019…1198', f.detail?.proprete)
  L('2.2', 'Béton armé fondations 350 kg/m³ (semelles + avant-poteaux)', 'm³', t.volSemelle, '6019…1195',
    (f.detail?.ba || []).filter((d) => /semelle|avant-poteau|filante/i.test(d.lib)))
  L('2.3', 'Béton armé chaînages & longrines 350 kg/m³', 'm³', t.volChainageBas, '6019…1195',
    (f.detail?.ba || []).filter((d) => /cha[îi]nage|longrine/i.test(d.lib)))
  L('2.4', 'Radier général BA 350 kg/m³', 'm³', f.volBAradier, 'radier', (f.detail?.ba || []).filter((d) => /radier/i.test(d.lib)))
  L('2.5', 'Gros béton banché', 'm³', t.volBanche, 'banche', (f.detail?.divers || []).filter((d) => /banché/i.test(d.lib)))
  L('2.6', 'Maçonnerie de moellons en fondation', 'm³', t.volMoellons, 'moellons', (f.detail?.divers || []).filter((d) => /moellons/i.test(d.lib)))
  L('2.7', 'Arase étanche', 'm²', t.surfArase, 'arase')
  L('2.8', 'Hérissonnage en pierres sèches', 'm²', t.surfHerisson, 'herisson')

  // 3 — Structure en élévation (A2)
  const detNiv = (key) => (t.parNiveau || []).flatMap((m) => (m.detail?.[key] || []).map((d) => ({ ...d, lib: `${m.nom || 'Niveau'} — ${d.lib}` })))
  L('3.1', 'Béton armé poteaux & raidisseurs 350 kg/m³', 'm³', t.volPoteaux, 'ba_elevation', detNiv('poteaux'))
  L('3.2', 'Béton armé poutres 350 kg/m³', 'm³', t.volPoutres, 'ba_elevation', detNiv('poutres'))
  L('3.3', 'Linteaux en béton armé', 'm³', t.volLinteaux, 'ba_elevation', detNiv('linteaux'))

  // 4 — Planchers (A3), par type
  const parPl = (type, key) => round2((t.parNiveau || []).filter((m) => m.typePlancher === type).reduce((s, m) => s + m[key], 0))
  L('4.1', 'Dalle pleine BA 350 kg/m³', 'm³', parPl('dallePleine', 'volPlancher'), '6019…2376')
  L('4.2', 'Plancher hourdis 15+5 (corps creux + compression)', 'm²', parPl('hourdis15', 'surfHourdis'), 'plancher_h15')
  L('4.3', 'Plancher hourdis 20+5 (corps creux + compression)', 'm²', parPl('hourdis20', 'surfHourdis'), 'plancher_h20')
  L('4.4', 'Dalle sur terre-plein', 'm³', parPl('dalleTP', 'volPlancher'), 'dalle_tp')

  // 5 — Maçonnerie par type (A4)
  let i5 = 1
  Object.entries(t.parTypeMur || {}).forEach(([type, v]) => {
    const inf = TYPES_MUR[type]
    if (inf && v.surf > 0) L(`5.${i5++}`, `Maçonnerie — ${inf.lab}`, 'm²', v.surf, inf.code, v.detail)
  })

  // 6 — Enduits / peinture (A6)
  L('6.1', 'Enduit intérieur au mortier de ciment', 'm²', t.enduitInt, 'enduit_int')
  L('6.2', 'Enduit extérieur au mortier de ciment', 'm²', t.enduitExt, 'enduit_ext')
  L('6.3', 'Peinture (faces enduites)', 'm²', round2((t.enduitInt || 0) + (t.enduitExt || 0)), '6019…2812')

  // 7 — Acier (A5)
  L('7.1', 'Aciers HA (ferraillage, tous éléments)', 'kg', t.acierKg, 'acierHA', t.acierDetail)

  // 8 — Couverture
  L('8.1', `Couverture — ${t.toiture?.lab || 'toiture'}`, 'm²', t.surfToiture, t.toiture?.code || 'toit_bac')

  const lignesPU = lignes.map((l) => {
    const pu = Math.round(px(l.code) * K)
    return { ...l, pu, montant: Math.round(l.q * pu) }
  })
  const ht = lignesPU.reduce((s, l) => s + l.montant, 0)
  return {
    lignes: lignesPU,
    ht, tva: Math.round(ht * TVA), ttc: Math.round(ht * (1 + TVA)),
    perimetre: 'DQE gros œuvre (terrassement → couverture) — HORS SECOND ŒUVRE : assainissement, étanchéité détaillée, revêtements, faux plafonds, plomberie, électricité et menuiseries non compris.',
  }
}
