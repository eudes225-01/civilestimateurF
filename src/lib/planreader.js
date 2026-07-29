// src/lib/planreader.js
// Lecture automatique de plan v2 (correctif A8 du rapport d'insuffisances).
// Principe : le modèle n'agrège RIEN et ne calcule RIEN. Il extrait des
// DONNÉES BRUTES structurées par vue (murs, pièces, ouvertures, poteaux,
// poutres, semelles, niveaux/HSP), avec un champ de confiance et une liste
// d'incertitudes. Le moteur déterministe (metre.js) calcule ensuite toutes
// les quantités à partir de ces données, après validation humaine (A10).
import { api } from './api.js'

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
Réponds STRICTEMENT avec un unique objet JSON valide, sans texte ni balise autour.`

const PROMPT_PROJET = `Tu es un opérateur de saisie pour un logiciel de métré BTP. Analyse cette planche
de plans architecturaux (elle peut contenir plusieurs vues : plans de niveaux, coupe,
façade, fondations).

${REGLES_COMMUNES}

Schéma de réponse :
{
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

const PROMPT_NIVEAU = `Tu es un opérateur de saisie pour un logiciel de métré BTP. Ce plan correspond
à UN SEUL niveau d'un bâtiment.

${REGLES_COMMUNES}

Schéma de réponse :
{
  "nom": "string (nom du niveau si lisible, sinon \\"Niveau\\")",
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

function parseJSON(text) {
  const clean = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('parse')
  return JSON.parse(clean.slice(start, end + 1))
}

function mediaBlock(file, data64) {
  return file.type === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: data64 } }
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

  let data64
  try { data64 = await readBase64(file) } catch (e) { return { ok: false, message: e.message } }
  const media = mediaBlock(file, data64)
  const prompt = mode === 'niveau' ? PROMPT_NIVEAU : PROMPT_PROJET

  const callModel = async (messages) => {
    const res = await api.analysePlan(messages)
    if (!res) throw Object.assign(new Error(ERRORS.offline), { code: 'offline' })
    if (res.error) throw Object.assign(new Error(ERRORS[res.error] || `Erreur : ${res.error}`), { code: res.error })
    return (res.content || []).map((b) => b.text || '').join('\n')
  }

  let parsed
  try {
    const text = await callModel([{ role: 'user', content: [media, { type: 'text', text: prompt }] }])
    parsed = parseJSON(text)
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
  } else {
    parsed.incertitudes = Array.isArray(parsed.incertitudes) ? parsed.incertitudes : []
    if (!(parsed.pieces?.length || parsed.murs?.length))
      return { ok: false, code: 'empty', message: 'Aucune pièce ni mur détecté sur ce plan de niveau.' }
  }

  // Seconde passe de vérification indépendante (A8) — optionnelle
  if (opts.verifier) {
    try {
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
