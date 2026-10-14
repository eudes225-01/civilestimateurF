// src/lib/planreader.js
// Lecture automatique de plan v2 (correctif A8 du rapport d'insuffisances).
// Principe : le modèle n'agrège RIEN et ne calcule RIEN. Il extrait des
// DONNÉES BRUTES structurées par vue (murs, pièces, ouvertures, poteaux,
// poutres, semelles, niveaux/HSP), avec un champ de confiance et une liste
// d'incertitudes. Le moteur déterministe (metre.js) calcule ensuite toutes
// les quantités à partir de ces données, après validation humaine (A10).
import { api } from './api.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const PLAN_ACCEPTS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const PLAN_MAX_MB = 8

const REGLES_COMMUNES = `RÈGLES STRICTES :
1. Tu ne calcules AUCUNE quantité, AUCUN total, AUCUNE surface agrégée. Tu ne fais que
   TRANSCRIRE ce qui est écrit ou mesurable sur le plan, élément par élément.
2. INTERDICTION D'INVENTER : si une cote est illisible, absente ou ambiguë, mets null
   pour ce champ ET ajoute une entrée explicite dans "incertitudes".
3. Chaque élément porte un champ "confiance": "haute" (cote lue clairement) ou
   "basse" (déduite de l'échelle, des proportions ou partiellement lisible).
4. Les cotes en centimètres sur les plans (ex : 320, 400) doivent être converties
   en mètres (3,20 ; 4,00). Les nombres utilisent le point décimal.
5. Types de murs d'après l'épaisseur : 0,10 m → "brique10" ou "agglo10" ;
   0,15 m → "agglo15" ; 0,20 m → "agglo20". Si l'épaisseur est inconnue : "inconnu".
6. Les poteaux sont les sections pochées (noircies) sur les vues en plan : compte-les
   et relève leurs sections (ex : 0.30 × 0.25).
7. Si le plan comporte une vue FONDATIONS (semelles S1, S2…, chaînages, longrines),
   transcris le tableau des semelles : type, nombre, dimensions, profondeur.
8. Lis les HSP (hauteurs sous plafond) sur la COUPE si elle existe (cotes verticales,
   mentions "HSP=…"). Sinon : null.
9. Indique si le plan montre un TOIT-TERRASSE (acrotère, mention terrasse, étanchéité)
   dans "toitTerrasseDetecte".
10. Chain-of-thought : Commence ton objet JSON par une clé "reflexion" contenant tes observations préliminaires sur le plan et la liste des vues que tu y détectes.
Réponds STRICTEMENT avec un unique objet JSON valide, sans texte ni balise autour.`

const PROMPT_PROJET = `Tu es un opérateur de saisie pour un logiciel de métré BTP. Analyse cette planche
de plans architecturaux (elle peut contenir plusieurs vues : plans de niveaux, coupe,
façade, fondations).

${REGLES_COMMUNES}

Schéma de réponse :
{
  "reflexion": "string (tes observations préliminaires, la liste des vues, etc.)",
  "titre": "string ou null (titre du projet si lisible)",
  "ville": "string ou null",
  "confiance": "haute" | "moyenne" | "basse",
  "incertitudes": ["chaque cote illisible, vue manquante ou ambiguïté, en une phrase"],
  "toitTerrasseDetecte": true | false,
  "niveaux": [
    {
      "nom": "string (ex: Rez-de-chaussée)",
      "HSP": number | null,
      "surfPlancher": number | null (UNIQUEMENT si une surface est écrite sur le plan, sinon null),
      "pieces": [
        { "nom": "string", "L": number|null, "l": number|null, "confiance": "haute"|"basse" }
      ],
      "murs": [
        { "nom": "string (ex: Façade sud, Mur cuisine/SDB)",
          "type": "brique10"|"agglo10"|"agglo15"|"agglo20"|"inconnu",
          "L": number|null, "H": number|null,
          "position": "exterieur"|"interieur"|"mitoyen",
          "portes": number, "fenetres": number,
          "confiance": "haute"|"basse" }
      ],
      "poteaux": [
        { "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" }
      ],
      "poutres": [
        { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" }
      ]
    }
  ],
  "fondations": {
    "detectee": true | false,
    "type": "filante" | "isolees" | "radier" | "inconnue",
    "semelles": [
      { "type": "string (S1, S2…)", "nb": number, "L": number|null, "l": number|null,
        "h": number|null, "prof": number|null, "confiance": "haute"|"basse" }
    ],
    "chainages": [ { "nom": "string|null", "nb": number, "L": number|null, "confiance": "haute"|"basse" } ],
    "longrines": [ { "nom": "string|null", "nb": number, "L": number|null, "confiance": "haute"|"basse" } ]
  }
}`

const PROMPT_LOCATOR = `Tu es un expert en lecture de plans BTP. Ton objectif est d'identifier toutes les vues distinctes présentes sur cette image de plan architectural.
Pour chaque vue détectée (ex: plan du RDC, plan de l'étage, coupe, façade, plan des fondations), donne-moi ses coordonnées sous la forme d'une bounding box en pixels absolus [x1, y1, x2, y2], où (x1, y1) est le coin supérieur gauche et (x2, y2) le coin inférieur droit de la vue.
Assure-toi d'englober toute la vue, y compris ses cotes extérieures et son titre.

Réponds STRICTEMENT avec un unique objet JSON valide selon ce schéma :
{
  "vues": [
    {
      "nom": "string (ex: 'Plan RDC', 'Coupe')",
      "box": [number, number, number, number]
    }
  ]
}`

const PROMPT_NIVEAU = `Tu es un opérateur de saisie pour un logiciel de métré BTP. Ce plan correspond
à UN SEUL niveau d'un bâtiment.

${REGLES_COMMUNES}

Schéma de réponse :
{
  "reflexion": "string (tes observations préliminaires, etc.)",
  "nom": "string (nom du niveau si lisible, sinon \"Niveau\")",
  "HSP": number | null,
  "confiance": "haute" | "moyenne" | "basse",
  "incertitudes": ["…"],
  "pieces": [ { "nom": "string", "L": number|null, "l": number|null, "confiance": "haute"|"basse" } ],
  "murs":   [ { "nom": "string", "type": "brique10"|"agglo10"|"agglo15"|"agglo20"|"inconnu",
                "L": number|null, "H": number|null, "position": "exterieur"|"interieur"|"mitoyen",
                "portes": number, "fenetres": number, "confiance": "haute"|"basse" } ],
  "poteaux": [ { "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" } ]
}`

const PROMPT_VERIF = (json) => `Voici un plan et une extraction JSON qui prétend le décrire.
Relis le plan INDÉPENDAMMENT et compare : signale toute valeur de l'extraction qui te
semble erronée ou inventée, et toute donnée importante du plan absente de l'extraction.

Extraction à contrôler :
${json}

Réponds STRICTEMENT en JSON : { "ecarts": ["…phrase par écart constaté…"], "confiance": "haute"|"moyenne"|"basse" }
Si tout concorde : { "ecarts": [], "confiance": "haute" }`

const ERRORS = {
  analyse_non_configuree: "Le service de lecture automatique n'est pas configuré sur le serveur (clé manquante).",
  premium_required: 'Cette fonction nécessite un accès actif.',
  offline: 'La lecture automatique nécessite le service en ligne (VITE_API_URL + serveur démarré).',
  parse: "Le plan n'a pas pu être interprété (cotes ou échelle illisibles).",
}

export function readBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Lecture du fichier impossible'))
    r.readAsDataURL(file)
  })
}

async function rasterizePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    let viewport = page.getViewport({ scale: 1 })
    const maxDim = Math.max(viewport.width, viewport.height)
    // On cible max ~3500px pour éviter la saturation mémoire, tout en gardant une excellente qualité (A0)
    const scale = Math.min(3, 3500 / maxDim)
    viewport = page.getViewport({ scale: Math.max(1.5, scale) })
    
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    
    await page.render({ canvasContext: ctx, viewport }).promise
    
    // JPEG 90% pour limiter la taille du payload envoyé au proxy
    images.push(canvas.toDataURL('image/jpeg', 0.90).split(',')[1])
  }
  return images
}

function loadImageFromBase64(b64, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:${mimeType};base64,${b64}`
  })
}

function getLocatorImage(img) {
  const maxDim = 1568 // Limite de redimensionnement de l'API Claude 3 Vision
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return {
    b64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1],
    scaleUp: 1 / scale,
    w, h
  }
}

function cropImage(img, box, scaleUp) {
  const x1 = Math.max(0, box[0] * scaleUp)
  const y1 = Math.max(0, box[1] * scaleUp)
  const x2 = Math.min(img.width, box[2] * scaleUp)
  const y2 = Math.min(img.height, box[3] * scaleUp)
  
  const w = x2 - x1
  const h = y2 - y1
  if (w <= 10 || h <= 10) return null
  
  // Limiter le crop à 3500px max pour éviter un payload démesuré
  const scale = Math.min(1, 3500 / Math.max(w, h))
  const cw = Math.round(w * scale)
  const ch = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(img, x1, y1, w, h, 0, 0, cw, ch)
  return canvas.toDataURL('image/jpeg', 0.90).split(',')[1]
}

function parseJSON(text) {
  const clean = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('parse')
  return JSON.parse(clean.slice(start, end + 1))
}

/**
 * Analyse un fichier de plan → extraction de données brutes (jamais de quantités).
 * @param {File} file
 * @param {'projet'|'niveau'} mode
 * @param {{verifier?: boolean}} opts - verifier: seconde passe de relecture indépendante (A8)
 */
export async function analyzePlan(file, mode = 'projet', opts = {}) {
  if (!file) return { ok: false, message: 'Aucun fichier sélectionné.' }
  if (!PLAN_ACCEPTS.includes(file.type))
    return { ok: false, code: 'format', message: 'Format non supporté. Utilisez un PDF ou une image (PNG, JPG, WEBP).' }
  if (file.size > PLAN_MAX_MB * 1024 * 1024)
    return { ok: false, code: 'size', message: `Fichier trop lourd (max ${PLAN_MAX_MB} Mo).` }

  let originalImages = []
  try {
    if (file.type === 'application/pdf') {
      const b64Array = await rasterizePDF(file)
      for (const b64 of b64Array) {
        originalImages.push(await loadImageFromBase64(b64, 'image/jpeg'))
      }
    } else {
      const data64 = await readBase64(file)
      originalImages.push(await loadImageFromBase64(data64, file.type))
    }
  } catch (e) {
    return { ok: false, message: e.message || ERRORS.parse }
  }

  const callModel = async (messages) => {
    const res = await api.analysePlan(messages)
    if (!res) throw Object.assign(new Error(ERRORS.offline), { code: 'offline' })
    if (res.error) throw Object.assign(new Error(ERRORS[res.error] || `Erreur : ${res.error}`), { code: res.error })
    return (res.content || []).map((b) => b.text || '').join('\n')
  }

  let parsed = {
    titre: null, ville: null, confiance: 'haute', incertitudes: [],
    toitTerrasseDetecte: false, niveaux: [], fondations: { detectee: false, semelles: [], chainages: [], longrines: [] }
  }

  try {
    if (mode === 'projet') {
      for (const img of originalImages) {
        // Passe 1 : Locator
        const loc = getLocatorImage(img)
        const locMedia = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: loc.b64 } }
        const locText = await callModel([{ role: 'user', content: [locMedia, { type: 'text', text: PROMPT_LOCATOR }] }])
        
        let locParsed
        try {
          locParsed = parseJSON(locText)
        } catch(e) {
          locParsed = { vues: [ { nom: "Plan entier", box: [0, 0, loc.w, loc.h] } ] }
        }
        
        const vues = (locParsed.vues && locParsed.vues.length > 0) ? locParsed.vues : [ { nom: "Plan entier", box: [0, 0, loc.w, loc.h] } ]
        
        // Passe 2 : Extraction par sous-vue (Séquentiel pour éviter un Timeout backend)
        for (const vue of vues) {
          const cropB64 = cropImage(img, vue.box, loc.scaleUp)
          if (!cropB64) continue
          
          const cropMedia = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: cropB64 } }
          const text = await callModel([{ role: 'user', content: [cropMedia, { type: 'text', text: PROMPT_PROJET }] }])
          
          try {
            const subRes = parseJSON(text)
            // Fusionner les données de la sous-vue dans l'objet global
            if (subRes.titre && !parsed.titre) parsed.titre = subRes.titre
            if (subRes.ville && !parsed.ville) parsed.ville = subRes.ville
            if (subRes.toitTerrasseDetecte) parsed.toitTerrasseDetecte = true
            if (subRes.confiance === 'basse' || subRes.confiance === 'moyenne') parsed.confiance = 'basse'
            if (subRes.incertitudes) parsed.incertitudes.push(...subRes.incertitudes)
            if (subRes.niveaux) parsed.niveaux.push(...subRes.niveaux)
            if (subRes.fondations && subRes.fondations.detectee) {
              parsed.fondations.detectee = true
              if (subRes.fondations.type && !parsed.fondations.type) parsed.fondations.type = subRes.fondations.type
              if (subRes.fondations.semelles) parsed.fondations.semelles.push(...subRes.fondations.semelles)
              if (subRes.fondations.chainages) parsed.fondations.chainages.push(...subRes.fondations.chainages)
              if (subRes.fondations.longrines) parsed.fondations.longrines.push(...subRes.fondations.longrines)
            }
          } catch (e) {
            parsed.incertitudes.push(`Échec de lecture de la vue: ${vue.nom}`)
          }
        }
      }
    } else {
      // Mode niveau (un seul envoi)
      const loc = getLocatorImage(originalImages[0])
      const media = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: loc.b64 } }
      const text = await callModel([{ role: 'user', content: [media, { type: 'text', text: PROMPT_NIVEAU }] }])
      parsed = parseJSON(text)
    }
  } catch (e) {
    if (e.code) return { ok: false, code: e.code, message: e.message }
    return { ok: false, code: 'parse', message: ERRORS.parse }
  }

  // Normalisation minimale
  if (mode === 'projet') {
    parsed.niveaux = Array.isArray(parsed.niveaux) ? parsed.niveaux : []
    parsed.incertitudes = Array.isArray(parsed.incertitudes) ? parsed.incertitudes : []
    parsed.fondations = parsed.fondations || { detectee: false }
    const vide = parsed.niveaux.every((n) => !(n.pieces?.length || n.murs?.length || n.poteaux?.length))
    if (!parsed.niveaux.length || vide)
      return { ok: false, code: 'empty', message: 'Aucune donnée exploitable détectée sur ce plan.' }
    if (!parsed.fondations.detectee) {
      parsed.incertitudes.push("Aucune vue FONDATIONS lue : les semelles/chaînages devront être saisis manuellement dans l'onglet Niveaux & métré.")
    }

    // Validation des bornes physiques (force la confiance à 'basse' pour alerter l'utilisateur)
    parsed.niveaux.forEach((n) => {
      ;(n.pieces || []).forEach(p => {
        if ((p.L && p.L > 50) || (p.l && p.l > 50)) p.confiance = 'basse'
      })
      ;(n.murs || []).forEach(m => {
        if ((m.H && (m.H < 0.5 || m.H > 10)) || (m.L && m.L > 100)) m.confiance = 'basse'
      })
      ;(n.poteaux || []).forEach(pt => {
        if ((pt.a && pt.a > 1) || (pt.b && pt.b > 1) || (pt.H && pt.H > 10)) pt.confiance = 'basse'
      })
    })
    if (parsed.fondations && parsed.fondations.semelles) {
      parsed.fondations.semelles.forEach(s => {
        if ((s.L && s.L > 5) || (s.l && s.l > 5) || (s.h && s.h > 2)) s.confiance = 'basse'
      })
    }
  } else {
    parsed.incertitudes = Array.isArray(parsed.incertitudes) ? parsed.incertitudes : []
    if (!(parsed.pieces?.length || parsed.murs?.length))
      return { ok: false, code: 'empty', message: 'Aucune pièce ni mur détecté sur ce plan de niveau.' }
  }

  // Seconde passe de vérification indépendante (A8) — optionnelle
  if (opts.verifier && mode === 'projet') {
    try {
      // Pour éviter de renvoyer tous les crops, on envoie juste la vue globale (locator)
      const loc = getLocatorImage(originalImages[0])
      const media = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: loc.b64 } }
      const text2 = await callModel([{ role: 'user', content: [media, { type: 'text', text: PROMPT_VERIF(JSON.stringify(parsed)) }] }])
      const verif = parseJSON(text2)
      if (Array.isArray(verif.ecarts) && verif.ecarts.length) {
        parsed.incertitudes.push(...verif.ecarts.map((e) => `Relecture : ${e}`))
        parsed.confiance = 'basse'
      }
    } catch { /* la vérification est un bonus : son échec n'invalide pas l'extraction */ }
  }

  return { ok: true, data: parsed }
}

// ── Normalisation vers le modèle interne ────────────────────────────────────

const n0 = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? '' : +v)

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
export function normSemelle(s) {
  return { type: s.type || 'S', nb: n0(s.nb) || 1, L: n0(s.L), l: n0(s.l), h: n0(s.h), prof: n0(s.prof), confiance: s.confiance || 'basse' }
}
export function normLineaire(c) {
  return { nom: c.nom || '', nb: n0(c.nb) || 1, L: n0(c.L), b: 0.2, h: 0.2, confiance: c.confiance || 'basse' }
}

/**
 * Convertit une extraction VALIDÉE par l'utilisateur (écran « Vérifier la lecture »)
 * en niveaux + correctifs de paramètres pour le moteur.
 */
export function extractionToProject(ex) {
  const levels = (ex.niveaux || []).map((n, i) => ({
    nom: n.nom || `Niveau ${i}`,
    rez: i === 0,
    HSP: n0(n.HSP) || '',
    surfPlancher: n0(n.surfPlancher) || '',
    tremies: '',
    plancher: i === 0 && (ex.niveaux || []).length === 1 ? 'dallePleine' : 'hourdis15',
    pieces: (n.pieces || []).map(normPiece),
    murs: (n.murs || []).map(normMur),
    poteaux: (n.poteaux || []).map(normPoteau),
    poutres: (n.poutres || []).map(normPoutre),
  }))

  const fondDet = ex.fondations || {}
  const patchParams = {
    planFlags: { toitTerrasseDetecte: !!ex.toitTerrasseDetecte },
  }
  if (ex.toitTerrasseDetecte) patchParams.toiture = 'terrasse'

  const aDesPoteaux = levels.some((lv) => lv.poteaux.length)
  patchParams.systeme = aDesPoteaux ? 'ossature' : 'murs'

  if (fondDet.detectee) {
    patchParams.fondation = {
      type: ['filante', 'isolees', 'radier'].includes(fondDet.type) ? fondDet.type : (fondDet.semelles?.length ? 'isolees' : 'filante'),
      semelles: (fondDet.semelles || []).map(normSemelle),
      chainages: (fondDet.chainages || []).map(normLineaire),
      longrines: (fondDet.longrines || []).map(normLineaire),
    }
  }

  return { levels, patchParams }
}
