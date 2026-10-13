// src/components/PlanReview.jsx
// Écran « VÉRIFIER LA LECTURE » : toutes les données brutes lues sur les plans,
// regroupées par type, éditables avant tout calcul. Les valeurs déduites ou
// douteuses sont surlignées. Rien n'est calculé avant la validation.
import React from 'react'
import { ClipboardCheck, AlertTriangle, Check, Trash2, Shuffle, ArrowRight, Plus } from 'lucide-react'
import { Button, Input, Select } from './ui/index.jsx'
import {
  TYPES_MUR, TYPES_PLANCHER, TYPES_PLANS, RESEAUX_PLOMBERIE, APPAREILS_SANITAIRES, TYPES_ELECTRIQUES,
  diametresPour, PENTES_EVACUATION, lacunesPlomberie, normaliserReseau, normaliserAppareil,
} from '../lib/metre.js'

const lowCls = 'bg-soleil-soft/70'

// ── mise à jour immuable par chemin ──
const getIn = (o, p) => p.reduce((x, k) => x?.[k], o)
const setIn = (o, [h, ...t], v) => {
  const c = Array.isArray(o) ? [...o] : { ...(o || {}) }
  c[h] = t.length ? setIn(o?.[h] ?? (typeof t[0] === 'number' ? [] : {}), t, v) : v
  return c
}

const optionsDe = (obj) => Object.entries(obj).map(([k, v]) => ({ v: k, l: v.lab }))

function Cellule({ col, value, row, low, onChange }) {
  const w = col.w || 'w-[64px]'
  let options = col.optionsFn ? col.optionsFn(row || {}) : col.options
  if (options) {
    // `choisir` : valeur lue absente ou non reconnue → liste fermée avec « À choisir »
    // (jamais une valeur par défaut posée en silence).
    const brut = col.norm ? col.norm(value) : value
    const rempli = brut !== null && brut !== undefined && brut !== ''
    let connue = options.some((o) => String(o.v) === String(brut))
    // Valeur lue valide mais hors liste (ex. Ø90) : on la garde visible plutôt que de l'effacer.
    if (!connue && rempli && !col.norm) { options = [...options, { v: brut, l: `${brut} (lu)` }]; connue = true }
    const val = connue ? String(brut) : (col.choisir ? '' : String(options[0].v))
    return (
      <div className={`${w} shrink-0`}>
        <Select value={val} onChange={(e) => onChange(col.numerique ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value)}
          className={`px-1.5 py-1 text-[12px] ${low || (col.choisir && !connue) ? lowCls : ''}`}>
          {col.choisir && <option value="">À choisir</option>}
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </Select>
      </div>
    )
  }
  if (col.text) {
    return <div className={`${w} shrink-0`}><Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} /></div>
  }
  return (
    <div className={`${w} shrink-0`}>
      <Input type="number" step="0.01" min="0" value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
        className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} />
    </div>
  )
}

/** Liste éditable : une ligne par élément lu. `req` = champ dont l'absence est surlignée. */
function Liste({ titre, rows, cols, path, onSet, onRemove, onAdd, vide }) {
  if (!rows || (!rows.length && !onAdd)) return null
  return (
    <div className="overflow-x-auto">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1">{titre} ({rows.length})</p>
      {rows.length === 0 && <p className="text-[12px] text-soleil-deep mb-1">{vide || 'Aucune ligne lue.'}</p>}
      {rows.length > 0 && <table className="text-[12px]">
        <thead>
          <tr className="text-muted text-[10.5px] uppercase">
            {cols.map((c) => <th key={c.k} className="text-left pr-2 pb-1 font-semibold">{c.lab}</th>)}<th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, j) => {
            const rowLow = r.confiance === 'basse' || r.type === 'inconnu'
            return (
              <tr key={j}>
                {cols.map((c) => {
                  const vide = c.req && (r[c.k] === null || r[c.k] === undefined || r[c.k] === '')
                  return (
                    <td key={c.k} className="pr-2 py-0.5">
                      <Cellule col={c} value={r[c.k]} row={r} low={rowLow || vide} onChange={(v) => onSet([...path, j, c.k], v)} />
                    </td>
                  )
                })}
                <td><button onClick={() => onRemove([...path, j])} className="text-muted hover:text-laterite" title="Supprimer"><Trash2 size={13} /></button></td>
              </tr>
            )
          })}
        </tbody>
      </table>}
      {onAdd && (
        <button type="button" onClick={onAdd} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-lagune-deep hover:underline">
          <Plus size={13} /> Ajouter une ligne
        </button>
      )}
    </div>
  )
}

const Champ = ({ lab, children }) => (
  <div><p className="text-[11px] text-muted mb-0.5">{lab}</p>{children}</div>
)
const Num = ({ value, onChange, w = 'w-[78px]', low }) => (
  <div className={w}>
    <Input type="number" step="0.01" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
      className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} />
  </div>
)

const Bloc = ({ titre, Ic, badge, children, open = true }) => (
  <details open={open} className="rounded-xl2 border border-line bg-card">
    <summary className="cursor-pointer select-none px-3.5 py-2.5 flex items-center gap-2 text-[13px] font-display font-semibold">
      {Ic && <Ic size={15} className="text-indigo" />}{titre}
      {badge && <span className="ml-auto text-[11px] font-normal text-muted">{badge}</span>}
    </summary>
    <div className="px-3.5 pb-3.5 pt-1 grid gap-4">{children}</div>
  </details>
)

const OPT = {
  mur: optionsDe(TYPES_MUR),
  pos: [{ v: 'exterieur', l: 'Extérieur' }, { v: 'interieur', l: 'Intérieur' }, { v: 'mitoyen', l: 'Mitoyen' }],
  plancher: optionsDe(TYPES_PLANCHER),
  reseau: optionsDe(RESEAUX_PLOMBERIE).map((o) => ({ v: o.v, l: o.v })),
  appareil: optionsDe(APPAREILS_SANITAIRES),
  elec: optionsDe(TYPES_ELECTRIQUES),
}

const C = {
  murs: [{ k: 'nom', lab: 'Désignation', text: true, w: 'w-[150px]' }, { k: 'type', lab: 'Type', options: OPT.mur, w: 'w-[150px]' }, { k: 'L', lab: 'L (m)', req: true }, { k: 'H', lab: 'H (m)', w: 'w-[58px]' }, { k: 'position', lab: 'Position', options: OPT.pos, w: 'w-[100px]' }, { k: 'portes', lab: 'Portes', w: 'w-[50px]' }, { k: 'fenetres', lab: 'Fen.', w: 'w-[50px]' }],
  pieces: [{ k: 'nom', lab: 'Pièce', text: true, w: 'w-[150px]' }, { k: 'L', lab: 'L (m)', req: true }, { k: 'l', lab: 'l (m)', req: true }],
  poteaux: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[70px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'a', lab: 'a (m)', req: true }, { k: 'b', lab: 'b (m)', req: true }, { k: 'H', lab: 'H (m)', w: 'w-[58px]' }],
  poutres: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[90px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'L', lab: 'L (m)', req: true }, { k: 'b', lab: 'b (m)', req: true }, { k: 'h', lab: 'h (m)', req: true }],
  voiles: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[70px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'L', lab: 'L (m)', req: true }, { k: 'ep', lab: 'Ép. (m)', req: true }, { k: 'H', lab: 'H (m)', w: 'w-[58px]' }],
  cv: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[70px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'a', lab: 'a (m)', req: true }, { k: 'b', lab: 'b (m)', req: true }, { k: 'H', lab: 'H (m)', w: 'w-[58px]' }],
  avantPoteaux: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[70px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'a', lab: 'a (m)', req: true }, { k: 'b', lab: 'b (m)', req: true }, { k: 'H', lab: 'H (m)', req: true }],
  semelles: [{ k: 'type', lab: 'Type', text: true, w: 'w-[64px]' }, { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'L', lab: 'L (m)', req: true, w: 'w-[62px]' }, { k: 'l', lab: 'l (m)', req: true, w: 'w-[62px]' }, { k: 'h', lab: 'h béton (m)', req: true, w: 'w-[72px]' }, { k: 'prof', lab: 'Prof. (m)', req: true, w: 'w-[66px]' }],
  lineaires: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[90px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'L', lab: 'L (m)', req: true }, { k: 'b', lab: 'b (m)', w: 'w-[58px]' }, { k: 'h', lab: 'h (m)', w: 'w-[58px]' }],
  appareils: [{ k: 'type', lab: 'Appareil', options: OPT.appareil, choisir: true, norm: (v) => { const k = normaliserAppareil(v); return k === 'autre' && !/autre/i.test(String(v ?? '')) ? '' : k }, w: 'w-[150px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'piece', lab: 'Pièce', text: true, w: 'w-[130px]' }],
  reseaux: [
    { k: 'reseau', lab: 'Réseau', options: OPT.reseau, choisir: true, norm: (v) => normaliserReseau(v) || '', w: 'w-[84px]' },
    { k: 'diam', lab: 'Ø (mm)', optionsFn: (r) => diametresPour(r.reseau).map((d) => ({ v: d, l: `Ø${d}` })), choisir: true, numerique: true, w: 'w-[84px]' },
    { k: 'L', lab: 'L (m)', req: true },
    { k: 'pente', lab: 'Pente (%)', optionsFn: (r) => (RESEAUX_PLOMBERIE[normaliserReseau(r.reseau)]?.evac ? PENTES_EVACUATION.map((p) => ({ v: p, l: `${p} %` })) : null), choisir: true, numerique: true, w: 'w-[84px]' },
    { k: 'nom', lab: 'Tronçon', text: true, w: 'w-[110px]' },
  ],
  regards: [{ k: 'nom', lab: 'Regard', text: true, w: 'w-[110px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }],
  elec: [{ k: 'type', lab: 'Symbole', options: OPT.elec, w: 'w-[220px]' }, { k: 'nb', lab: 'Nb', w: 'w-[50px]' }, { k: 'piece', lab: 'Pièce', text: true, w: 'w-[120px]' }, { k: 'repere', lab: 'Repère / usage', text: true, w: 'w-[130px]' }],
  pans: [{ k: 'nom', lab: 'Pan', text: true, w: 'w-[110px]' }, { k: 'pente', lab: 'Pente (%)', req: true, w: 'w-[70px]' }, { k: 'surface', lab: 'Surface en plan (m²)', w: 'w-[90px]' }],
  troncons: [{ k: 'nom', lab: 'Repère', text: true, w: 'w-[110px]' }, { k: 'L', lab: 'L (m)', req: true }],
}

export default function PlanReview({ ex, setEx, onValider }) {
  const set = (path, v) => setEx((e) => setIn(e, path, v))
  const remove = (path) => setEx((e) => {
    const p = path.slice(0, -1), i = path[path.length - 1]
    return setIn(e, p, getIn(e, p).filter((_, k) => k !== i))
  })
  const L = { onSet: set, onRemove: remove }

  const nbElems = ex.niveaux.reduce((s, n) => s + ['pieces', 'murs', 'poteaux', 'poutres', 'voiles', 'chainagesV'].reduce((a, k) => a + (n[k]?.length || 0), 0), 0)
  const f = ex.fondations
  const nbFond = f.detectee ? (f.semelles.length + f.avantPoteaux.length + f.chainages.length + f.longrines.length) : 0
  const nbPlomb = ex.plomberie ? ex.plomberie.appareils.length + ex.plomberie.reseaux.length + ex.plomberie.regards.length : 0
  const nbElec = ex.electricite ? ex.electricite.elements.length : 0
  const t = ex.toiture

  return (
    <div className="mt-4 rounded-xl2 border border-lagune/40 bg-card overflow-hidden animate-fade-up">
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-line bg-lagune-soft/60">
        <ClipboardCheck size={16} className="text-lagune-deep" />
        <b className="text-[13.5px] text-lagune-deep">Vérifier la lecture avant calcul</b>
        <span className="text-[12.5px] text-muted">
          — {ex.vues.filter((v) => v.type).length} vue(s) lue(s) · {ex.niveaux.length} niveau(x), {nbElems + nbFond + nbPlomb + nbElec} élément(s) · confiance globale : {ex.confiance || 'moyenne'}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-soleil-deep">
          <span className={`inline-block w-3 h-3 rounded ${lowCls} border border-soleil/40`} /> cote déduite / à contrôler
        </span>
      </div>

      <div className="p-4 grid gap-4 max-h-[640px] overflow-auto">
        {/* ── Routage : ce qui a été lu, comme quel type ── */}
        <Bloc titre="Plans lus et catégorisés" Ic={Shuffle} badge={`${ex.vues.length} vue(s)`}>
          <div className="overflow-x-auto">
            <table className="text-[12px] min-w-[560px]">
              <thead><tr className="text-muted text-[10.5px] uppercase">
                <th className="text-left pr-3 pb-1">Vue</th><th className="text-left pr-3 pb-1">Déposée comme</th><th className="text-left pr-3 pb-1">Lue comme</th><th className="text-left pb-1">Calcul appliqué</th>
              </tr></thead>
              <tbody>
                {ex.vues.map((v, i) => (
                  <tr key={i} className={v.reclasse || !v.type ? lowCls : ''}>
                    <td className="pr-3 py-0.5"><span className="font-semibold">{v.nom}</span> <span className="text-muted">· {v.fichier}</span></td>
                    <td className="pr-3">{TYPES_PLANS[v.typeDepose]?.court || '—'}</td>
                    <td className="pr-3 font-semibold">{v.type ? TYPES_PLANS[v.type].court : 'Non reconnu'}{v.reclasse && <span className="ml-1.5 text-[10.5px] text-soleil-deep">(reclassée)</span>}</td>
                    <td className="text-muted">{v.type ? <span className="inline-flex items-center gap-1"><ArrowRight size={11} />{TYPES_PLANS[v.type].module}</span> : 'ignorée'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloc>

        {ex.incertitudes.length > 0 && (
          <div className="rounded-xl2 border border-soleil/30 bg-soleil-soft/40 px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-soleil-deep mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={13} /> Incertitudes et divergences signalées ({ex.incertitudes.length})
            </p>
            <ul className="grid gap-1 text-[12.5px] text-ink list-disc pl-5">
              {ex.incertitudes.map((inc, i) => <li key={i}>{inc}</li>)}
            </ul>
          </div>
        )}

        {ex.toitTerrasseDetecte && (
          <p className="text-[12.5px] text-jade-deep bg-jade-soft border border-jade/25 rounded-[9px] px-3 py-2">
            Toit-terrasse détecté sur les plans → le type de couverture sera réglé sur « toit-terrasse ».
          </p>
        )}

        {/* ── Niveaux (plan, coupe, coffrage, poutraison) ── */}
        {ex.niveaux.map((n, i) => (
          <Bloc key={n.cle || i} titre={`Niveau — ${n.nom}`} Ic={null} badge={`lu sur : ${(n._sources || []).map((s) => TYPES_PLANS[s]?.court || s).join(', ') || '—'}`}>
            <div className="flex flex-wrap items-end gap-3">
              <Champ lab="Nom du niveau"><div className="w-[190px]"><Input value={n.nom || ''} onChange={(e) => set(['niveaux', i, 'nom'], e.target.value)} className="py-1 text-[12.5px] font-semibold" /></div></Champ>
              <Champ lab="HSP (m)"><Num value={n.HSP} onChange={(v) => set(['niveaux', i, 'HSP'], v)} low={n.HSP == null} /></Champ>
              <Champ lab="Surf. plancher (m²)"><Num value={n.surfPlancher} onChange={(v) => set(['niveaux', i, 'surfPlancher'], v)} w="w-[96px]" /></Champ>
              <Champ lab="Plancher haut">
                <div className="w-[190px]">
                  <Select value={n.plancher || ''} onChange={(e) => set(['niveaux', i, 'plancher'], e.target.value || undefined)} className="px-1.5 py-1 text-[12px]">
                    <option value="">Par défaut</option>
                    {OPT.plancher.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </Select>
                </div>
              </Champ>
              {n.plancher === 'dallePleine' && <Champ lab="Ép. dalle (m)"><Num value={n.epDalle} onChange={(v) => set(['niveaux', i, 'epDalle'], v)} w="w-[78px]" /></Champ>}
            </div>
            <Liste titre="Murs" rows={n.murs} cols={C.murs} path={['niveaux', i, 'murs']} {...L} />
            <Liste titre="Pièces" rows={n.pieces} cols={C.pieces} path={['niveaux', i, 'pieces']} {...L} />
            <Liste titre="Poteaux" rows={n.poteaux} cols={C.poteaux} path={['niveaux', i, 'poteaux']} {...L} />
            <Liste titre="Poutres et consoles" rows={n.poutres} cols={C.poutres} path={['niveaux', i, 'poutres']} {...L} />
            <Liste titre="Voiles" rows={n.voiles} cols={C.voiles} path={['niveaux', i, 'voiles']} {...L} />
            <Liste titre="Chaînages verticaux" rows={n.chainagesV} cols={C.cv} path={['niveaux', i, 'chainagesV']} {...L} />
            {n.nervures && (
              <p className="text-[12px] text-muted">Nervures lues : {n.nervures.nb ?? '?'} × {n.nervures.L ?? '?'} m, entraxe {n.nervures.entraxe ?? '?'} m — informatif (le plancher est calculé par type de corps creux).</p>
            )}
          </Bloc>
        ))}

        {/* ── Fondations ── */}
        {f.detectee && (
          <Bloc titre={`Fondations — ${f.type || 'type à confirmer'}`} badge={`${nbFond} élément(s)`}>
            <div className="flex flex-wrap items-end gap-3">
              <Champ lab="Système">
                <div className="w-[150px]">
                  <Select value={f.type || ''} onChange={(e) => set(['fondations', 'type'], e.target.value || null)} className="px-1.5 py-1 text-[12px]">
                    <option value="">À confirmer</option><option value="filante">Filante</option><option value="isolees">Isolées</option><option value="radier">Radier</option>
                  </Select>
                </div>
              </Champ>
              <Champ lab="Prof. fouille (m)"><Num value={f.profondeurFouille} onChange={(v) => set(['fondations', 'profondeurFouille'], v)} /></Champ>
              {f.filante && <>
                <Champ lab="Semelle filante : larg. (m)"><Num value={f.filante.largeur} onChange={(v) => set(['fondations', 'filante', 'largeur'], v)} w="w-[96px]" /></Champ>
                <Champ lab="haut. (m)"><Num value={f.filante.hauteur} onChange={(v) => set(['fondations', 'filante', 'hauteur'], v)} /></Champ>
                <Champ lab="Linéaire (m)"><Num value={f.filante.lineaire} onChange={(v) => set(['fondations', 'filante', 'lineaire'], v)} /></Champ>
              </>}
              {f.radier && <Champ lab="Ép. radier (m)"><Num value={f.radier.ep} onChange={(v) => set(['fondations', 'radier', 'ep'], v)} /></Champ>}
              {f.proprete && <Champ lab="Ép. propreté (m)"><Num value={f.proprete.ep} onChange={(v) => set(['fondations', 'proprete', 'ep'], v)} /></Champ>}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {f.banche && <>
                <Champ lab="Gros béton banché : b (m)"><Num value={f.banche.b} onChange={(v) => set(['fondations', 'banche', 'b'], v)} w="w-[110px]" /></Champ>
                <Champ lab="h (m)"><Num value={f.banche.h} onChange={(v) => set(['fondations', 'banche', 'h'], v)} /></Champ>
              </>}
              {f.moellons && <>
                <Champ lab="Moellons : b (m)"><Num value={f.moellons.b} onChange={(v) => set(['fondations', 'moellons', 'b'], v)} w="w-[90px]" /></Champ>
                <Champ lab="h (m)"><Num value={f.moellons.h} onChange={(v) => set(['fondations', 'moellons', 'h'], v)} /></Champ>
              </>}
              <label className="flex items-center gap-1.5 text-[12.5px] pb-1">
                <input type="checkbox" checked={!!f.herisson} onChange={(e) => set(['fondations', 'herisson'], e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
                Hérissonnage en pierres sèches
              </label>
            </div>
            <Liste titre="Semelles" rows={f.semelles} cols={C.semelles} path={['fondations', 'semelles']} {...L} />
            <Liste titre="Avant-poteaux (fûts en fondation)" rows={f.avantPoteaux} cols={C.avantPoteaux} path={['fondations', 'avantPoteaux']} {...L} />
            <Liste titre="Chaînages bas" rows={f.chainages} cols={C.lineaires} path={['fondations', 'chainages']} {...L} />
            <Liste titre="Longrines" rows={f.longrines} cols={C.lineaires} path={['fondations', 'longrines']} {...L} />
            {f.prescriptions.length > 0 && (
              <div className="rounded-[10px] border border-soleil/30 bg-soleil-soft/40 px-3 py-2.5">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-soleil-deep mb-1">Prescriptions écrites sur le plan (à contrôler sur chantier)</p>
                <ul className="grid gap-1 text-[12.5px] list-disc pl-5">
                  {f.prescriptions.map((x, k) => <li key={k}>{x}</li>)}
                </ul>
                <p className="text-[11.5px] text-muted mt-1.5">Recopiées telles quelles : elles ne modifient aucun calcul. Le contrôle du fond de fouille avant bétonnage reste nécessaire.</p>
              </div>
            )}
          </Bloc>
        )}

        {/* ── Plomberie ── */}
        {ex.plomberie && (() => {
          const lacunes = lacunesPlomberie(ex.plomberie)
          const ajout = (liste, ligne) => () => setEx((e) => setIn(e, ['plomberie', liste], [...(e.plomberie?.[liste] || []), ligne]))
          return (
            <Bloc titre="Plomberie et assainissement" badge={`${nbPlomb} ligne(s)`}>
              {lacunes.length > 0 && (
                <div className="rounded-[10px] border border-soleil/30 bg-soleil-soft/40 px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-soleil-deep mb-1 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Lecture insuffisante : à compléter ({lacunes.length})
                  </p>
                  <ul className="grid gap-0.5 text-[12.5px] list-disc pl-5">
                    {lacunes.slice(0, 8).map((l, k) => <li key={k}>{l.msg}</li>)}
                    {lacunes.length > 8 && <li>… et {lacunes.length - 8} autre(s) dans les tableaux ci-dessous.</li>}
                  </ul>
                  <p className="text-[11.5px] text-muted mt-1.5">Les cases surlignées proposent des valeurs à choisir dans une liste (réseaux, diamètres, pentes usuels). Rien n'est rempli à votre place.</p>
                </div>
              )}
              <Liste titre="Appareils sanitaires" rows={ex.plomberie.appareils} cols={C.appareils} path={['plomberie', 'appareils']} {...L}
                onAdd={ajout('appareils', { type: '', nb: 1, piece: '' })} vide="Aucun appareil lu." />
              <Liste titre="Canalisations" rows={ex.plomberie.reseaux} cols={C.reseaux} path={['plomberie', 'reseaux']} {...L}
                onAdd={ajout('reseaux', { reseau: '', diam: null, L: '', pente: null, nom: '' })} vide="Aucune canalisation lue." />
              <Liste titre="Regards" rows={ex.plomberie.regards} cols={C.regards} path={['plomberie', 'regards']} {...L}
                onAdd={ajout('regards', { nom: '', nb: 1 })} vide="Aucun regard lu." />
            </Bloc>
          )
        })()}

        {/* ── Électricité ── */}
        {ex.electricite && (
          <Bloc titre="Électricité" badge={`${nbElec} ligne(s)`}>
            <Liste titre="Symboles comptés" rows={ex.electricite.elements} cols={C.elec} path={['electricite', 'elements']} {...L} />
          </Bloc>
        )}

        {/* ── Toiture ── */}
        {t && (
          <Bloc titre="Toiture">
            <div className="flex flex-wrap items-end gap-3">
              <Champ lab="Pente générale (%)"><Num value={t.pente} onChange={(v) => set(['toiture', 'pente'], v)} w="w-[96px]" low={t.pente == null && !t.pans.length} /></Champ>
              <Champ lab="Débord (m)"><Num value={t.debord} onChange={(v) => set(['toiture', 'debord'], v)} /></Champ>
              <Champ lab="Hors-tout L (m)"><Num value={t.L} onChange={(v) => set(['toiture', 'L'], v)} /></Champ>
              <Champ lab="Hors-tout l (m)"><Num value={t.l} onChange={(v) => set(['toiture', 'l'], v)} /></Champ>
              <Champ lab="Surface en plan lue (m²)"><Num value={t.surfaceProjetee} onChange={(v) => set(['toiture', 'surfaceProjetee'], v)} w="w-[110px]" /></Champ>
            </div>
            <Liste titre="Pans" rows={t.pans} cols={C.pans} path={['toiture', 'pans']} {...L} />
            <Liste titre="Faîtages" rows={t.faitages} cols={C.troncons} path={['toiture', 'faitages']} {...L} />
            <Liste titre="Noues" rows={t.noues} cols={C.troncons} path={['toiture', 'noues']} {...L} />
            <Liste titre="Égouts" rows={t.egouts} cols={C.troncons} path={['toiture', 'egouts']} {...L} />
            <Liste titre="Chéneaux" rows={t.cheneaux} cols={C.troncons} path={['toiture', 'cheneaux']} {...L} />
          </Bloc>
        )}
      </div>

      <div className="px-4 py-3 border-t border-line flex flex-wrap items-center gap-3 bg-card/50">
        <Button variant="jade" onClick={onValider}><Check size={15} /> Valider → calculer le métré</Button>
        <span className="text-[12px] text-muted">
          Rien n'est calculé avant cette validation. Elle remplace les niveaux et la fondation du métré par cette lecture ; tout reste ajustable ensuite dans « Niveaux &amp; métré ».
        </span>
      </div>
    </div>
  )
}
