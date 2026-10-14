// src/components/PlanDeposits.jsx
// Un dépôt par type de plan (document « Codification des plans techniques BTP »).
// Composant de présentation : l'état des fichiers vit dans PlanAnalyzer.
import React, { useRef, useState } from 'react'
import {
  UploadCloud, FileText, Image as ImageIcon, X, Layers, Lock, Home, Scissors, Droplets,
  Zap, Grid3x3, Box, ArrowDownToLine, AlertTriangle, Ruler,
} from 'lucide-react'
import { CLES_DEPOT, typeDepot, estObligatoire } from '../lib/planGate.js'
import { PLAN_ACCEPTS, PLAN_MAX_MB } from '../lib/planreader.js'

// Classes complètes (et non construites dynamiquement) pour que Tailwind les détecte.
const META = {
  fondation:   { Ic: ArrowDownToLine, box: 'bg-laterite', ring: 'border-laterite bg-laterite-soft/60', hover: 'hover:border-laterite hover:bg-laterite-soft/40', multi: false, aide: 'Un fichier (ou une planche contenant le plan de fondation).' },
  plan:        { Ic: Layers,          box: 'bg-indigo',   ring: 'border-indigo bg-indigo-soft/60',     hover: 'hover:border-indigo hover:bg-indigo-soft/40',     multi: true,  aide: 'Un fichier par étage (RDC, R+1…) — ils sont rapprochés par niveau.' },
  coupe:       { Ic: Scissors,        box: 'bg-lagune',   ring: 'border-lagune bg-lagune-soft/60',     hover: 'hover:border-lagune hover:bg-lagune-soft/40',     multi: true,  aide: 'Coupe générale ; ajoutez les coupes de détail si besoin. Source des HSP.' },
  plomberie:   { Ic: Droplets,        box: 'bg-lagune',   ring: 'border-lagune bg-lagune-soft/60',     hover: 'hover:border-lagune hover:bg-lagune-soft/40',     multi: true,  aide: 'Un fichier par niveau si le réseau est dessiné par étage.' },
  electricite: { Ic: Zap,             box: 'bg-soleil',   ring: 'border-soleil bg-soleil-soft/60',     hover: 'hover:border-soleil hover:bg-soleil-soft/40',     multi: true,  aide: 'Gardez la légende des symboles dans le cadrage.' },
  poutraison:  { Ic: Grid3x3,         box: 'bg-jade',     ring: 'border-jade bg-jade-soft/60',         hover: 'hover:border-jade hover:bg-jade-soft/40',         multi: true,  aide: 'Un fichier par plancher (R+1, R+2…).' },
  toiture:     { Ic: Home,            box: 'bg-laterite', ring: 'border-laterite bg-laterite-soft/60', hover: 'hover:border-laterite hover:bg-laterite-soft/40', multi: false, aide: 'Vue de dessus avec flèches de pente.' },
  ferraillage: { Ic: Ruler,           box: 'bg-jade',     ring: 'border-jade bg-jade-soft/60',         hover: 'hover:border-jade hover:bg-jade-soft/40',         multi: true,  aide: 'Un fichier par élément ou par niveau ferraillé. Conservé dans le dossier.' },
  coffrage:    { Ic: Box,             box: 'bg-indigo',   ring: 'border-indigo bg-indigo-soft/60',     hover: 'hover:border-indigo hover:bg-indigo-soft/40',     multi: true,  aide: 'Un fichier par niveau coffré (fondation, RDC, R+1…).' },
}

const fmtMo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`

function Slot({ type, files, onAdd, onRemove, disabled, verrouille }) {
  const t = typeDepot(type)
  const oblig = estObligatoire(type)
  const m = META[type]
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')

  const ajouter = (list) => {
    setErr('')
    const ok = [], rejets = []
    Array.from(list || []).forEach((f) => {
      if (!PLAN_ACCEPTS.includes(f.type)) rejets.push(`« ${f.name} » : format non supporté`)
      else if (f.size > PLAN_MAX_MB * 1024 * 1024) rejets.push(`« ${f.name} » : plus de ${PLAN_MAX_MB} Mo`)
      else ok.push(f)
    })
    if (rejets.length) setErr(rejets.join(' · '))
    if (ok.length) onAdd(m.multi ? ok : ok.slice(0, 1))
  }

  const rempli = files.length > 0
  return (
    <div className={`rounded-xl2 border-2 p-3.5 transition-colors bg-card ${rempli ? m.ring : 'border-line'} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-2.5">
        <div className={`shrink-0 w-9 h-9 rounded-[10px] grid place-items-center text-white ${m.box}`}><m.Ic size={18} /></div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[14px] leading-tight">{t.lab}{oblig && !verrouille && <span className="ml-1.5 align-middle text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-laterite-soft text-laterite-deep border border-laterite/25">Obligatoire</span>}{verrouille && <span className="ml-1.5 align-middle inline-flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-soleil-soft text-soleil-deep border border-soleil/30"><Lock size={9} /> Premium</span>}</h3>
          <p className="text-[11.5px] text-muted leading-snug mt-0.5">→ {t.module}</p>
        </div>
        {rempli && <span className="shrink-0 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-jade-soft text-jade-deep border border-jade/25">{files.length}</span>}
      </div>

      <p className="mt-2 text-[11px] font-mono text-muted leading-snug">{t.repere}</p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); ajouter(e.dataTransfer.files) }}
        className={`mt-2.5 cursor-pointer rounded-[10px] border-2 border-dashed px-3 py-3 text-center text-[12.5px] transition-all ${drag ? 'border-lagune bg-lagune-soft scale-[1.01]' : `border-line-strong bg-muted-bg/50 ${m.hover}`}`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple={m.multi} className="sr-only"
          onChange={(e) => { ajouter(e.target.files); e.target.value = '' }} />
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><UploadCloud size={15} /> {rempli && m.multi ? 'Ajouter un plan' : rempli ? 'Remplacer' : 'Déposer ici'}</span>
        <span className="block text-muted text-[11px] mt-0.5">{m.aide}</span>
      </div>

      {err && <p className="mt-2 text-[11.5px] text-laterite-deep flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{err}</p>}

      {rempli && (
        <ul className="mt-2.5 grid gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[12px] bg-card border border-line rounded-[8px] px-2 py-1">
              {f.type === 'application/pdf' ? <FileText size={14} className="shrink-0 text-laterite" /> : <ImageIcon size={14} className="shrink-0 text-lagune" />}
              <span className="truncate flex-1 font-medium">{f.name}</span>
              <span className="shrink-0 text-muted font-mono text-[10.5px]">{fmtMo(f.size)}</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(i) }} className="shrink-0 text-muted hover:text-laterite" title="Retirer"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PlanDeposits({ depots, setDepots, disabled, verrouille = false }) {
  const add = (type, list) => setDepots((d) => ({ ...d, [type]: [...(d[type] || []), ...list] }))
  const remove = (type, i) => setDepots((d) => ({ ...d, [type]: (d[type] || []).filter((_, k) => k !== i) }))
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {CLES_DEPOT.map((k) => (
        <Slot key={k} type={k} files={depots[k] || []} onAdd={(l) => add(k, l)} onRemove={(i) => remove(k, i)} disabled={disabled} verrouille={verrouille} />
      ))}
    </div>
  )
}
