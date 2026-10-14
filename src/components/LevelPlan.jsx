// src/components/LevelPlan.jsx
// Lecture assistée d'un plan pour UN niveau : extrait pièces, murs et poteaux
// (données brutes, jamais de quantités), affiche les incertitudes, puis
// laisse l'utilisateur importer dans le niveau.
import React, { useRef, useState } from 'react'
import { UploadCloud, Loader, Check, X, AlertTriangle, ScanLine, ChevronDown, Lock } from 'lucide-react'
import { EtiquettePremium } from './StatutBadge.jsx'
import { Button } from './ui/index.jsx'
import { analyzeNiveau, normPiece, normMur, normPoteau, PLAN_MAX_MB } from '../lib/planreader.js'
import { TYPES_MUR } from '../lib/metre.js'
import PlanHelp from './PlanHelp.jsx'

// `premium` : l'import d'un plan (lecture automatique) est une fonction Premium ; sinon, un bouton ouvre l'abonnement.
export default function LevelPlan({ levelName, onApply, premium = true, onPremium }) {
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)

  const reset = () => { setFile(null); setResult(null); setError('') }

  const analyser = async () => {
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    const res = await analyzeNiveau(file)
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    setResult(res.data)
  }

  const importer = () => {
    if (!result) return
    onApply({
      nom: result.nom,
      HSP: result.HSP || '',
      pieces: (result.pieces || []).map(normPiece),
      murs: (result.murs || []).map(normMur),
      poteaux: (result.poteaux || []).map(normPoteau),
    })
    setOpen(false); reset()
  }

  const incertitudes = result?.incertitudes || []

  if (!premium) {
    return (
      <div className="border-t border-line">
        <button onClick={onPremium} className="w-full flex items-center gap-2 px-5 py-2.5 text-[12.5px] font-semibold text-soleil-deep hover:bg-soleil-soft/50 transition-colors">
          <Lock size={14} />
          Importer le plan de ce niveau (lecture assistée)
          <EtiquettePremium className="ml-auto" />
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-[12.5px] font-semibold text-lagune-deep hover:bg-lagune-soft/50 transition-colors"
      >
        <ScanLine size={14} />
        Importer le plan de ce niveau (lecture assistée)
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-4 grid gap-3 animate-fade-up">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); reset(); setFile(e.dataTransfer.files?.[0]) }}
            className={`cursor-pointer rounded-[11px] border-2 border-dashed px-4 py-5 text-center transition-all text-[12.5px]
              ${drag ? 'border-lagune bg-lagune-soft' : 'border-line-strong bg-muted-bg/50 hover:border-lagune'}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only"
              onChange={(e) => { reset(); setFile(e.target.files?.[0]) }} />
            <UploadCloud size={20} className="mx-auto text-lagune mb-1.5" />
            {file ? (
              <span className="font-semibold inline-flex items-center gap-1.5">
                {file.name}
                <button onClick={(e) => { e.stopPropagation(); reset() }} className="text-muted hover:text-laterite"><X size={12} /></button>
              </span>
            ) : (
              <span className="text-muted">Plan de « {levelName} » — PDF/image, max {PLAN_MAX_MB} Mo</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button size="sm" variant="accent" onClick={analyser} disabled={!file || busy}>
              {busy ? <Loader size={13} className="animate-spin" /> : <ScanLine size={13} />}
              {busy ? 'Lecture…' : 'Lire ce plan'}
            </Button>
          </div>

          {error && (
            <div className="grid gap-2.5">
              <div className="rounded-[10px] bg-laterite-soft border border-laterite/25 px-3 py-2 flex gap-2 text-[12px] text-laterite-deep">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
              <PlanHelp compact />
            </div>
          )}

          {result && (
            <div className="rounded-[11px] border border-jade/30 bg-jade-soft p-3">
              <p className="text-[12px] font-semibold text-jade-deep mb-2 flex items-center gap-1.5">
                <Check size={14} />
                {(result.pieces?.length || 0)} pièce(s), {(result.murs?.length || 0)} mur(s), {(result.poteaux?.length || 0)} groupe(s) de poteaux détectés
                {result.HSP ? ` · HSP ${result.HSP} m` : ''}
              </p>

              {incertitudes.length > 0 && (
                <div className="rounded-[9px] bg-soleil-soft/70 border border-soleil/30 px-2.5 py-2 mb-2">
                  <p className="text-[11px] font-semibold text-soleil-deep mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Incertitudes signalées</p>
                  <ul className="text-[11.5px] text-ink list-disc pl-4 grid gap-0.5">
                    {incertitudes.map((inc, i) => <li key={i}>{inc}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-auto mb-3">
                {(result.murs || []).map((m, j) => (
                  <div key={`m${j}`} className={`text-[12px] border border-line rounded-[7px] px-2 py-1 flex justify-between gap-2 ${m.confiance === 'basse' ? 'bg-soleil-soft/60' : 'bg-card'}`}>
                    <span className="font-medium truncate">{m.nom || 'Mur'} <span className="text-muted">({TYPES_MUR[m.type]?.lab || m.type})</span></span>
                    <span className="font-mono text-muted shrink-0">{m.L ?? '?'} m</span>
                  </div>
                ))}
                {(result.pieces || []).map((p, j) => (
                  <div key={`p${j}`} className={`text-[12px] border border-line rounded-[7px] px-2 py-1 flex justify-between gap-2 ${p.confiance === 'basse' ? 'bg-soleil-soft/60' : 'bg-card'}`}>
                    <span className="font-medium truncate">{p.nom}</span>
                    <span className="font-mono text-muted shrink-0">{p.L ?? '?'}×{p.l ?? '?'} m</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="sm" variant="jade" onClick={importer}>
                  <Check size={13} /> Importer dans ce niveau
                </Button>
                <span className="text-[11.5px] text-muted">Chaque valeur restera éditable après import.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
