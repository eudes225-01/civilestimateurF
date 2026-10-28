// src/lib/planreader.js
// Lecture de plans par type (document « Codification des plans techniques BTP »).
//
// Le plan est déposé dans UNE case par type (fondation, vue en plan, coupe,
// plomberie, électricité, poutraison, toiture, coffrage). Chaque fichier est
// rastérisé, découpé en vues (passe « locator »), et chaque vue est :
//   1. classée : le locator remonte cartouche + codes lus, le moteur
//      (classifierPlan / routerPlan) tranche entre signature, type annoncé et
//      type du dépôt — une vue déposée au mauvais endroit est reclassée ;
//   2. lue avec l'extracteur PROPRE à son type (prompt dédié) ;
//   3. relue indépendamment (double lecture, optionnelle).
// Principe inchangé : le modèle n'agrège ni ne calcule RIEN. Il transcrit des
// données brutes ; les calculs sont faits ensuite par le moteur déterministe,
// module par type, après validation humaine (écran « Vérifier la lecture »).
import { api } from './api.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { TYPES_PLANS, CLES_TYPES_PLANS, routerPlan, lireIFC } from 'civilestimateur-engine'
import { consolider, estVide } from './planmerge.js'

export { extractionToProject, normPiece, normMur, normPoteau } from './planmerge.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const PLAN_ACCEPTS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const PLAN_MAX_MB = 8
// Maquette IFC (facultative) : lue dans le navigateur, sans modèle ni envoi au serveur.
export const IFC_MAX_MB = 40
export const estIFC = (f) => /\.ifc$/i.test(f?.name || '')

// ── Prompts ──────────────────────────────────────────────────────────────────
const REGLES_COMMUNES = `RÈGLES STRICTES :
1. Tu ne calcules AUCUNE quantité, AUCUN total, AUCUNE surface agrégée. Tu ne fais que
   TRANSCRIRE ce qui est écrit ou mesurable sur le plan, élément par élément.
2. INTERDICTION D'INVENTER : si une cote est illisible, absente ou ambiguë, mets null
   pour ce champ ET ajoute une entrée explicite dans "incertitudes".
3. Chaque élément porte un champ "confiance": "haute" (cote lue clairement) ou
   "basse" (déduite de l'échelle, des proportions ou partiellement lisible).
4. Les cotes en centimètres sur les plans (ex : 320, 400) doivent être converties
   en mètres (3,20 ; 4,00). Les nombres utilisent le point décimal.
5. Chain-of-thought : commence ton objet JSON par une clé "reflexion" contenant tes
   observations préliminaires sur la vue.
Réponds STRICTEMENT avec un unique objet JSON valide, sans texte ni balise autour.`

const signaturesPourLocator = () => CLES_TYPES_PLANS
  .map((k) => `- "${k}" = ${TYPES_PLANS[k].lab} : ${TYPES_PLANS[k].repere}`).join('\n')

const PROMPT_LOCATOR = `Tu es un expert en lecture de plans BTP. Identifie toutes les vues distinctes présentes sur cette image
(plan de fondation, plan d'étage, coupe, plomberie, électricité, poutraison, toiture, coffrage…).

Pour chaque vue, donne :
- "nom" : désignation de la vue (ex : "Plan RDC", "Coupe A-A") ;
- "type" : UNE valeur parmi "fondation", "plan", "coupe", "plomberie", "electricite", "poutraison", "toiture", "coffrage" ;
- "cartouche" : le titre EXACT lu dans le cartouche ou sous la vue (ex : "PLAN DE COFFRAGE R+1"), null s'il est absent ;
- "codes" : la liste (max 25) des codes et mentions réellement lus sur la vue (ex : "SF", "S2", "P1", "EF", "Ø100", "HSP", "(16+4)", "V1", "VV", "TGBT", "30%") ;
- "box" : [x1, y1, x2, y2] en pixels absolus ((x1,y1) coin supérieur gauche), englobant la vue entière avec ses cotes extérieures et son titre.

Signatures de reconnaissance par type :
${signaturesPourLocator()}

Ne devine pas : ne liste dans "codes" que ce qui est lisible. Réponds STRICTEMENT avec un unique objet JSON valide :
{ "vues": [ { "nom": "string", "type": "string", "cartouche": "string|null", "codes": ["string"], "box": [number, number, number, number] } ] }`

const ENTETE = (titre) => `Tu es un opérateur de saisie pour un logiciel de métré BTP. Cette vue est un ${titre}.\n\n${REGLES_COMMUNES}\n`

const PROMPTS = {
  fondation: `${ENTETE("PLAN DE FONDATION ET D'IMPLANTATION")}
Les données de fondation ne viennent d'aucune ville ni d'aucune zone : elles viennent UNIQUEMENT de ce plan (et de ses coupes, détails
et notes). Relève donc TOUT ce qui est dessiné, coté ou écrit, et mets null pour ce qui n'y figure pas.
CODES À RECONNAÎTRE : SF = semelle filante ; SI = semelle isolée ; SC = semelle continue (sous mur) ;
R = radier ; LN / LG = longrine ; BP = béton de propreté ; S1, S2… = semelles isolées numérotées
(souvent alignées sur le poteau : semelle S2 sous poteau P2) ; TN = terrain naturel.
ANNOTATIONS : "Sf(40x25ht)" = semelle filante de 40 cm de large × 25 cm de haut → largeur 0.40, hauteur 0.25 ;
cotes de niveau en cercle, négatives (ex : -1.20) = niveau d'assise / profondeur d'ancrage → profondeurFouille = 1.20 (valeur POSITIVE, en m) ;
tableau de nomenclature d'armatures (Pos., Code Forme, HAØ, longueur) : IGNORE-le, ce n'est pas une dimension de béton.
Pour des semelles isolées, relève un enregistrement par type (S1, S2…) avec le nombre d'exemplaires.
"lineaire" (filante) : UNIQUEMENT si une longueur totale est écrite, sinon null.
Relève aussi, s'ils figurent sur le plan : les fûts / attentes de poteaux en fondation (avantPoteaux : repère, nombre, section a × b,
hauteur H) ; les murs de soubassement en gros béton banché ("banche" : largeur b, hauteur h) ou en moellons ("moellons" : b, h) ;
un hérissonnage en pierres sèches ("herisson" : true si dessiné ou mentionné) ; les longrines et chaînages bas (repère, nombre,
longueur, section) ; l'épaisseur du béton de propreté et celle du radier.
"prescriptions" : recopie TELLES QU'ÉCRITES (sans les interpréter ni les compléter) les mentions du plan, des coupes et des notes qui
conditionnent l'exécution : sol d'assise attendu ou niveau d'assise exigé, repère de nivellement, eau / drainage, remblai / purge,
classe ou dosage du béton, enrobage, tolérances. Une phrase par prescription, liste vide si rien n'est écrit.

Schéma de réponse :
{
  "reflexion": "string", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "detectee": true,
  "type": "filante" | "isolees" | "radier" | "inconnue",
  "filante": { "largeur": number|null, "hauteur": number|null, "lineaire": number|null } | null,
  "semelles": [ { "type": "string (S1, S2…)", "nb": number, "L": number|null, "l": number|null, "h": number|null, "prof": number|null, "confiance": "haute"|"basse" } ],
  "avantPoteaux": [ { "nom": "string|null (P1…)", "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" } ],
  "chainages": [ { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ],
  "longrines": [ { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ],
  "banche": { "b": number|null, "h": number|null } | null,
  "moellons": { "b": number|null, "h": number|null } | null,
  "herisson": true|false|null,
  "radier": { "ep": number|null } | null,
  "proprete": { "ep": number|null } | null,
  "profondeurFouille": number|null,
  "prescriptions": ["string"]
}`,

  plan: `${ENTETE("PLAN D'UN SEUL NIVEAU (vue en plan par étage)")}
CODES À RECONNAÎTRE : portes P1, P2… (arc de cercle = sens d'ouverture) ; fenêtres / baies F1, F2… ou B1, B2… ;
pièces = nom + surface (ex : « Chambre 1 — 12,5 m2 ») ; niveaux RDC, R+1, R+2… ; axes de trame (lettres / chiffres).
ANNOTATIONS : l'épaisseur des murs est cotée directement (15, 20, 25 cm) ; cotes cumulées et partielles.
Types de murs d'après l'épaisseur : 0,10 m → "brique10" ou "agglo10" ; 0,15 m → "agglo15" ; 0,20 m → "agglo20" ;
toute autre épaisseur (ex : 0,25 m) ou inconnue → "inconnu" + une entrée dans "incertitudes".
Les poteaux sont les sections pochées (noircies) : compte-les et relève leurs sections.
HSP : null sauf si elle est ÉCRITE sur ce plan (elle se lit normalement sur la coupe).
"surfPlancher" : UNIQUEMENT si une surface totale du niveau est écrite, sinon null.
Compte les portes et fenêtres de chaque mur d'après leurs repères (P<n>, F<n>/B<n>).

Schéma de réponse :
{
  "reflexion": "string", "nom": "string (RDC, R+1… ; \\"Niveau\\" si illisible)", "HSP": number|null, "surfPlancher": number|null,
  "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "toitTerrasseDetecte": true|false,
  "pieces": [ { "nom": "string", "L": number|null, "l": number|null, "confiance": "haute"|"basse" } ],
  "murs":   [ { "nom": "string", "type": "brique10"|"agglo10"|"agglo15"|"agglo20"|"inconnu", "L": number|null, "H": number|null,
                "position": "exterieur"|"interieur"|"mitoyen", "portes": number, "fenetres": number, "confiance": "haute"|"basse" } ],
  "poteaux": [ { "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" } ]
}`,

  coupe: `${ENTETE('COUPE (dessin de détail)')}
CODES À RECONNAÎTRE : repère de coupe A-A / B-B ; HSP = hauteur sous plafond ; NF = niveau fini ; NGF = niveau général ;
TN = terrain naturel ; hachures différentes par matériau (béton plein, terre, isolant, bois, gros béton) ;
cotes de niveau en cercle ou triangle à chaque changement de niveau.
Relève, pour CHAQUE niveau visible sur la coupe, sa HSP (cotes verticales, mention "HSP=…"), sa cote NF si lisible
et l'épaisseur de son plancher haut si elle est cotée. "profondeurFondation" : profondeur de la base des fondations
sous le TN, en valeur POSITIVE, si elle est cotée. Indique si un acrotère / une terrasse est visible.

Schéma de réponse :
{
  "reflexion": "string", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "toitTerrasseDetecte": true|false,
  "niveaux": [ { "nom": "string (RDC, R+1…)", "HSP": number|null, "NF": number|null, "epDalle": number|null, "confiance": "haute"|"basse" } ],
  "profondeurFondation": number|null
}`,

  plomberie: `${ENTETE('PLAN DE PLOMBERIE')}
RÉSEAUX : EF = eau froide ; EC = eau chaude ; EU = eaux usées ; EV = eaux vannes ; EP = eaux pluviales ; AEP = adduction eau potable.
APPAREILS (pictogrammes ISO 4067) : WC, lavabo, douche, baignoire, évier — compte-les UN PAR UN, pièce par pièce.
"Ø" suivi d'un nombre = diamètre de canalisation en MILLIMÈTRES (Ø100 → 100) ; pente d'évacuation en % avec flèche (→ nombre en %) ;
regard = cercle ou carré avec "R" + numéro.
Pour chaque tronçon de canalisation, relève : réseau, diamètre, longueur (cote lue, sinon déduite de l'échelle avec confiance "basse"), pente.
Ne regroupe pas des tronçons de diamètres différents.

Schéma de réponse :
{
  "reflexion": "string", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "appareils": [ { "type": "wc"|"lavabo"|"douche"|"baignoire"|"evier"|"autre", "nb": number, "piece": "string|null", "confiance": "haute"|"basse" } ],
  "reseaux": [ { "reseau": "EF"|"EC"|"EU"|"EV"|"EP"|"AEP", "diam": number|null, "L": number|null, "pente": number|null, "nom": "string|null", "confiance": "haute"|"basse" } ],
  "regards": [ { "nom": "string|null", "nb": number, "confiance": "haute"|"basse" } ]
}`,

  electricite: `${ENTETE("PLAN D'ÉLECTRICITÉ (NF C 15-100 / IEC 60617)")}
SYMBOLES : point lumineux = cercle simple ; interrupteur simple = symbole avec petit crochet ; va-et-vient (VV) = symbole à deux positions ;
bouton poussoir = symbole avec petit « T » ; prise de courant 16 A = symbole normalisé avec terre ; prise spécialisée = symbole avec
indication de puissance / circuit dédié ; prise RJ45 / VDI = carré ou rectangle avec mention RJ45 ; tableau = TGBT (général) ou TD (divisionnaire).
Les traits pointillés relient un interrupteur aux points qu'il commande : ce ne sont PAS des éléments à compter.
Sur un schéma unifilaire, un trait oblique + chiffre = nombre de conducteurs : ne le compte pas.
Utilise la LÉGENDE du plan (en marge) pour identifier les symboles. Compte chaque symbole, pièce par pièce.

Schéma de réponse :
{
  "reflexion": "string", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "elements": [ { "type": "point_lumineux"|"interrupteur_simple"|"va_et_vient"|"bouton_poussoir"|"prise_16a"|"prise_specialisee"|"rj45"|"tableau",
                  "nb": number, "piece": "string|null", "repere": "string|null (TGBT/TD pour un tableau, usage ou puissance pour une prise spécialisée)",
                  "confiance": "haute"|"basse" } ]
}`,

  poutraison: `${ENTETE('PLAN DE POUTRAISON ET NERVURES (un seul niveau)')}
DÉSIGNATIONS : poutres P<n>(largeur×hauteur) — ex. P1(20x40) → b 0.20, h 0.40 — ou un numéro suivi de la section entre parenthèses ;
nervures / poutrelles N1, N2… (trait d'axe fort) ; chevêtres = renforts autour des réservations / trémies.
ANNOTATIONS : sens de portée (flèches) ; entraxe des nervures coté (ex : 60 cm entre axes → 0.60) ;
épaisseur de plancher composée « (16+4) » = 16 cm de hourdis + 4 cm de dalle de compression.
EXCEPTION d'unité : pour "plancher", donne "hourdis" et "compression" en CENTIMÈTRES tels qu'écrits (16 et 4), pas en mètres.
"nervures" : nombre total lu (nb), longueur d'une nervure courante (L) si elle est uniforme (sinon null + incertitude), entraxe.

Schéma de réponse :
{
  "reflexion": "string", "niveau": "string (RDC, R+1… ; \\"Niveau\\" si illisible)", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "poutres": [ { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ],
  "nervures": { "nb": number|null, "L": number|null, "entraxe": number|null } | null,
  "plancher": { "hourdis": number|null, "compression": number|null } | null,
  "chevetres": number|null
}`,

  toiture: `${ENTETE('PLAN DE TOITURE')}
DÉSIGNATIONS : pente indiquée en % avec flèche de sens d'écoulement (→ nombre en %, ex : 30) ; faîtage, noue, égout, chéneau
(lignes conventionnelles) ; débord de toit coté depuis le nu du mur (en m).
Relève la pente générale si elle est unique, sinon une entrée par pan avec sa pente. "surface" d'un pan = surface EN PLAN (projection
horizontale) UNIQUEMENT si elle est écrite. Sinon relève les dimensions hors-tout du bâtiment (L, l) et le débord.
Relève la longueur de chaque faîtage, noue, égout et chéneau lue ou cotée.
Indique "toitTerrasseDetecte": true si le plan montre un toit-terrasse (acrotère, mention terrasse, étanchéité).

Schéma de réponse :
{
  "reflexion": "string", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "toitTerrasseDetecte": true|false,
  "pente": number|null,
  "pans": [ { "nom": "string|null", "pente": number|null, "surface": number|null } ],
  "L": number|null, "l": number|null, "debord": number|null, "surfaceProjetee": number|null,
  "faitages": [ { "nom": "string|null", "L": number|null } ],
  "noues":    [ { "nom": "string|null", "L": number|null } ],
  "egouts":   [ { "nom": "string|null", "L": number|null } ],
  "cheneaux": [ { "nom": "string|null", "L": number|null } ]
}`,

  coffrage: `${ENTETE('PLAN DE COFFRAGE (un seul niveau)')}
DÉSIGNATIONS : poteaux P<n> (carré, rond ou rectangulaire, en coupe, trait fort ; même repère sur toute la hauteur du bâtiment) ;
poutres = numéro + section entre parenthèses, largeur × hauteur (ex : 1(20x40) → b 0.20, h 0.40 ; un chiffre additionnel peut indiquer
l'étage : 101 = poutre 1 du 1er étage) ; voiles V<n> avec épaisseur (15, 18, 20, 25 cm) ; dalles D<n> avec épaisseur entre deux cercles
en trait fin (16, 18, 20, 22 cm) ; longrines L<n> / LN<n> (niveau fondation) ; linteaux L<n> (au-dessus des baies) ;
chaînages verticaux CV<n> ; consoles C<n> avec section comme une poutre.
TRAME : axes en lettres (A, B, C…) et chiffres (1, 2, 3…), entraxes cotés (souvent 4,50 à 6,00 m) ; nœud = intersection (ex : B-3).
Une longueur de poutre = entraxe entre appuis : si tu la déduis de la trame, confiance "basse".
Poteau circulaire : forme "rond" et a = b = diamètre. Poteau carré / rectangulaire : forme "carre" ou "rect".
Dalles : donne l'épaisseur, et la surface si elle est écrite, sinon les deux cotes L × l du panneau rectangulaire (jamais un produit calculé).
Compte un poteau par repère (ex : 4 poteaux P1 de même section → nb 4).

Schéma de réponse :
{
  "reflexion": "string", "niveau": "string (RDC, R+1… ; \\"Niveau\\" si illisible)", "confiance": "haute"|"moyenne"|"basse", "incertitudes": ["…"],
  "poteaux":  [ { "nom": "string|null (P1…)", "forme": "carre"|"rect"|"rond", "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" } ],
  "poutres":  [ { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ],
  "voiles":   [ { "nom": "string|null (V1…)", "nb": number, "L": number|null, "ep": number|null, "H": number|null, "confiance": "haute"|"basse" } ],
  "dalles":   [ { "nom": "string|null (D1…)", "ep": number|null, "surface": number|null, "L": number|null, "l": number|null, "confiance": "haute"|"basse" } ],
  "longrines": [ { "nom": "string|null", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ],
  "chainagesV": [ { "nom": "string|null (CV1…)", "nb": number, "a": number|null, "b": number|null, "H": number|null, "confiance": "haute"|"basse" } ],
  "consoles": [ { "nom": "string|null (C1…)", "nb": number, "L": number|null, "b": number|null, "h": number|null, "confiance": "haute"|"basse" } ]
}`,
}

/** Prompt d'extraction propre à un type de plan. */
export const promptPour = (type) => PROMPTS[type]

const PROMPT_VERIF = (json) => `Voici une vue de plan et une extraction JSON qui prétend la décrire.
Relis la vue INDÉPENDAMMENT et compare : signale toute valeur de l'extraction qui te
semble erronée ou inventée, et toute donnée importante de la vue absente de l'extraction.

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

// ── Images ───────────────────────────────────────────────────────────────────
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
    // ~3500 px max pour éviter la saturation mémoire tout en gardant une bonne qualité (A0)
    const scale = Math.min(3, 3500 / maxDim)
    viewport = page.getViewport({ scale: Math.max(1.5, scale) })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
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
  const maxDim = 1568 // limite de redimensionnement de l'API vision
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
  return { b64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], scaleUp: 1 / scale, w, h }
}

function cropImage(img, box, scaleUp) {
  if (!Array.isArray(box) || box.length < 4) return null
  const x1 = Math.max(0, box[0] * scaleUp)
  const y1 = Math.max(0, box[1] * scaleUp)
  const x2 = Math.min(img.width, box[2] * scaleUp)
  const y2 = Math.min(img.height, box[3] * scaleUp)
  const w = x2 - x1
  const h = y2 - y1
  if (!(w > 10 && h > 10)) return null
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

export function parseJSON(text) {
  const clean = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('parse')
  return JSON.parse(clean.slice(start, end + 1))
}

async function callModel(messages) {
  const res = await api.analysePlan(messages)
  if (!res) throw Object.assign(new Error(ERRORS.offline), { code: 'offline' })
  if (res.error) throw Object.assign(new Error(ERRORS[res.error] || `Erreur : ${res.error}`), { code: res.error })
  return (res.content || []).map((b) => b.text || '').join('\n')
}

const mediaJpeg = (b64) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } })

async function chargerImages(file) {
  if (file.type === 'application/pdf') {
    const pages = await rasterizePDF(file)
    const imgs = []
    for (const b64 of pages) imgs.push(await loadImageFromBase64(b64, 'image/jpeg'))
    return imgs
  }
  return [await loadImageFromBase64(await readBase64(file), file.type)]
}

/**
 * Lecture de tous les plans déposés, par type.
 * @param {Object<string, File[]>} depots  { fondation: [File], plan: [File, File], … }
 * @param {{verifier?: boolean, onProgress?: (p: {fait: number, total: number, message: string}) => void}} opts
 * @returns {Promise<{ok: true, data: Object} | {ok: false, code?: string, message: string}>}
 */
export async function analyzePlans(depots = {}, opts = {}) {
  const { verifier = true, onProgress = () => {} } = opts
  const fichiers = []
  // Dépôt libre (sans catégorie) d'abord, puis les dépôts classés par l'utilisateur.
  // Pour un dépôt libre, aucun type n'est annoncé : chaque vue est reconnue par signature (cartouche, codes).
  for (const type of ['libre', ...CLES_TYPES_PLANS]) for (const file of depots[type] || []) fichiers.push({ type, file })
  const ifcFichiers = depots.ifc || []
  if (!fichiers.length && !ifcFichiers.length) return { ok: false, message: 'Aucun plan déposé.' }
  for (const f of ifcFichiers) {
    if (/\.(ifczip|zip)$/i.test(f.name)) return { ok: false, code: 'format', message: `« ${f.name} » : les archives IFC compressées ne sont pas lues. Extrayez le fichier .ifc, ou exportez-le sans compression.` }
    if (!estIFC(f)) return { ok: false, code: 'format', message: `« ${f.name} » : la maquette doit être un fichier .ifc.` }
    if (f.size > IFC_MAX_MB * 1024 * 1024) return { ok: false, code: 'size', message: `« ${f.name} » : maquette trop lourde (max ${IFC_MAX_MB} Mo). Exportez uniquement les éléments de construction (sans mobilier ni végétation).` }
  }

  for (const { file } of fichiers) {
    if (!PLAN_ACCEPTS.includes(file.type)) return { ok: false, code: 'format', message: `« ${file.name} » : format non supporté. Utilisez un PDF ou une image (PNG, JPG, WEBP).` }
    if (file.size > PLAN_MAX_MB * 1024 * 1024) return { ok: false, code: 'size', message: `« ${file.name} » : fichier trop lourd (max ${PLAN_MAX_MB} Mo).` }
  }

  const lectures = []
  let fait = 0
  const total = fichiers.length + ifcFichiers.length
  const dire = (message) => onProgress({ fait, total, message })

  // Maquette(s) IFC : lecture déterministe des quantités, avant les plans PDF / images.
  for (const file of ifcFichiers) {
    dire(`Lecture de la maquette IFC « ${file.name} »…`)
    let res
    try { res = lireIFC(await file.text()) } catch (e) { res = { ok: false, message: `lecture impossible (${e.message || 'erreur'})` } }
    if (!res.ok) {
      // Facultative : une maquette illisible n'empêche pas la lecture des plans PDF.
      lectures.push({ type: null, data: null, vue: { nom: 'Maquette IFC', fichier: file.name, typeDepose: 'ifc', type: null, reclasse: false, source: 'ifc', confiance: 'basse', message: `Maquette IFC « ${file.name} » non utilisée : ${res.message}` } })
    } else {
      res.niveaux.forEach((niv, i) => lectures.push({
        type: 'plan',
        data: { ...niv, titre: i === 0 ? res.titre : null, incertitudes: i === 0 ? res.incertitudes : [] },
        vue: { nom: `Maquette IFC — ${niv.nom}`, fichier: file.name, typeDepose: 'ifc', type: 'plan', reclasse: false, source: 'ifc', confiance: 'haute', message: null },
      }))
    }
    fait += 1
    dire(`« ${file.name} » lu.`)
  }

  try {
    for (const { type: typeDepose, file } of fichiers) {
      dire(`Ouverture de « ${file.name} »…`)
      let images
      try { images = await chargerImages(file) } catch (e) { return { ok: false, message: `« ${file.name} » : ${e.message || ERRORS.parse}` } }

      for (let pi = 0; pi < images.length; pi++) {
        const img = images[pi]
        const page = images.length > 1 ? ` (page ${pi + 1}/${images.length})` : ''
        dire(`Repérage des vues — ${TYPES_PLANS[typeDepose]?.court || 'classement automatique'} · ${file.name}${page}`)

        // Passe 1 : locator (vues + classification par cartouche et codes lus)
        const loc = getLocatorImage(img)
        let vues
        try {
          const lp = parseJSON(await callModel([{ role: 'user', content: [mediaJpeg(loc.b64), { type: 'text', text: PROMPT_LOCATOR }] }]))
          vues = Array.isArray(lp.vues) && lp.vues.length ? lp.vues : null
        } catch (e) {
          if (e.code) throw e
        }
        if (!vues) vues = [{ nom: 'Plan entier', type: null, cartouche: null, codes: [], box: [0, 0, loc.w, loc.h] }]

        // Passe 2 : routage + extraction propre au type (séquentiel : évite un timeout du proxy)
        for (const vue of vues) {
          const route = routerPlan({ typeDepose, typeIA: vue.type, cartouche: vue.cartouche, codes: vue.codes })
          const trace = {
            nom: vue.nom || 'Vue', fichier: file.name, typeDepose, type: route.type,
            reclasse: route.reclasse, source: route.source, confiance: route.confiance, message: route.message,
          }
          if (!route.type) { lectures.push({ type: null, data: null, vue: trace }); continue }

          dire(`Lecture « ${TYPES_PLANS[route.type].court} » — ${vue.nom || 'vue'}${route.reclasse ? ' (reclassée)' : ''}`)
          const cropB64 = cropImage(img, vue.box, loc.scaleUp)
          if (!cropB64) { lectures.push({ type: null, data: null, vue: { ...trace, message: `Vue « ${vue.nom} » trop petite ou mal délimitée : ignorée.` } }); continue }

          let data
          try {
            data = parseJSON(await callModel([{ role: 'user', content: [mediaJpeg(cropB64), { type: 'text', text: PROMPTS[route.type] }] }]))
          } catch (e) {
            if (e.code) throw e
            lectures.push({ type: null, data: null, vue: { ...trace, message: `Échec de lecture de la vue « ${vue.nom} » (${TYPES_PLANS[route.type].court}).` } })
            continue
          }

          // Double lecture indépendante (bonus : son échec n'invalide pas l'extraction)
          if (verifier) {
            try {
              dire(`Relecture indépendante — ${TYPES_PLANS[route.type].court} · ${vue.nom || 'vue'}`)
              const verif = parseJSON(await callModel([{ role: 'user', content: [mediaJpeg(cropB64), { type: 'text', text: PROMPT_VERIF(JSON.stringify(data)) }] }]))
              if (Array.isArray(verif.ecarts) && verif.ecarts.length) {
                data.incertitudes = [...(Array.isArray(data.incertitudes) ? data.incertitudes : []), ...verif.ecarts.map((e) => `Relecture (${TYPES_PLANS[route.type].court}) : ${e}`)]
                data.confiance = 'basse'
              }
            } catch (e) { if (e.code && e.code !== 'parse') throw e }
          }
          lectures.push({ type: route.type, data, vue: trace })
        }
      }
      fait += 1
      dire(`« ${file.name} » lu.`)
    }
  } catch (e) {
    if (e.code) return { ok: false, code: e.code, message: e.message }
    return { ok: false, code: 'parse', message: ERRORS.parse }
  }

  const ex = consolider(lectures)
  if (estVide(ex)) return { ok: false, code: 'empty', message: 'Aucune donnée exploitable détectée sur les plans déposés.' }
  return { ok: true, data: ex }
}

/**
 * Lecture d'un plan d'UN seul niveau (import rapide depuis l'onglet « Niveaux & métré »).
 * Même extracteur « vue en plan » que le dépôt par type, sans passe de repérage.
 * @returns {Promise<{ok: true, data: Object} | {ok: false, code?: string, message: string}>}
 */
export async function analyzeNiveau(file) {
  if (!file) return { ok: false, message: 'Aucun fichier sélectionné.' }
  if (!PLAN_ACCEPTS.includes(file.type)) return { ok: false, code: 'format', message: 'Format non supporté. Utilisez un PDF ou une image (PNG, JPG, WEBP).' }
  if (file.size > PLAN_MAX_MB * 1024 * 1024) return { ok: false, code: 'size', message: `Fichier trop lourd (max ${PLAN_MAX_MB} Mo).` }
  try {
    const [img] = await chargerImages(file)
    const loc = getLocatorImage(img)
    const data = parseJSON(await callModel([{ role: 'user', content: [mediaJpeg(loc.b64), { type: 'text', text: PROMPTS.plan }] }]))
    data.incertitudes = Array.isArray(data.incertitudes) ? data.incertitudes : []
    if (!(data.pieces?.length || data.murs?.length)) return { ok: false, code: 'empty', message: 'Aucune pièce ni mur détecté sur ce plan de niveau.' }
    return { ok: true, data }
  } catch (e) {
    if (e.code) return { ok: false, code: e.code, message: e.message }
    return { ok: false, code: 'parse', message: ERRORS.parse }
  }
}
