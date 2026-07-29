// src/components/PlanAnalyzer.jsx
// Lecture de plan v2 : dépôt → extraction de données brutes → écran
// « VÉRIFIER LA LECTURE » (correctif A10) → validation humaine → report
// dans le métré. Rien n'est calculé avant la validation. Les éléments à
// confiance basse sont surlignés, les incertitudes remontées par la lecture
// sont listées. Promesse UI : « détection automatique assistée ».
import React, { useRef, useState } from 'react'
import { UploadCloud, FileText, Image as ImageIcon, ScanLine, Loader, Check, X, AlertTriangle, Wand2, Trash2, ClipboardCheck } from 'lucide-react'
import { Card, Button, SectionTitle, Badge, Input, Select } from './ui/index.jsx'
import { analyzePlan, extractionToProject, PLAN_MAX_MB } from '../lib/planreader.js'
import { TYPES_MUR } from '../lib/metre.js'
import PlanHelp from './PlanHelp.jsx'

const lowCls = 'bg-soleil-soft/70'   // surlignage confiance basse

function CellNum({ value, onChange, low, w = 'w-[72px]' }) {
  return (
    <div className={`${w} shrink-0 inline-block`}>
      <Input type="number" step="0.01" min="0" value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
        className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} />
    </div>
  )
}

export default function PlanAnalyzer({ proj, setProj, levels, setLevels, params, setParams }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ex, setEx] = useState(null)          // extraction en cours de vérification
  const [applied, setApplied] = useState(false)
  const [drag, setDrag] = useState(false)
  const [verifier2e, setVerifier2e] = useState(true)

  const pick = (f) => { setError(''); setEx(null); setApplied(false); if (f) setFile(f) }

  const analyser = async () => {
    if (!file) return
    setBusy(true); setError(''); setEx(null); setApplied(false)
    const res = await analyzePlan(file, 'projet', { verifier: verifier2e })
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    setEx(res.data)
  }

  // ── Édition de l'extraction (avant validation) ──
  const upNiveau = (i, k, v) => setEx((e) => {
    const nx = { ...e, niveaux: [...e.niveaux] }
    nx.niveaux[i] = { ...nx.niveaux[i], [k]: v }
    return nx
  })
  const upItem = (i, list, j, k, v) => setEx((e) => {
    const nx = { ...e, niveaux: [...e.niveaux] }
    const lv = { ...nx.niveaux[i], [list]: [...(nx.niveaux[i][list] || [])] }
    lv[list][j] = { ...lv[list][j], [k]: v }
    nx.niveaux[i] = lv
    return nx
  })
  const rmItem = (i, list, j) => setEx((e) => {
    const nx = { ...e, niveaux: [...e.niveaux] }
    const lv = { ...nx.niveaux[i], [list]: (nx.niveaux[i][list] || []).filter((_, idx) => idx !== j) }
    nx.niveaux[i] = lv
    return nx
  })
  const upSemelle = (j, k, v) => setEx((e) => {
    const f = { ...(e.fondations || {}), semelles: [...(e.fondations?.semelles || [])] }
    f.semelles[j] = { ...f.semelles[j], [k]: v }
    return { ...e, fondations: f }
  })

  // ── Validation → calcul (rien n'est calculé avant ce clic) ──
  const valider = () => {
    if (!ex) return
    const { levels: newLevels, patchParams } = extractionToProject(ex)
    if (newLevels.length) setLevels(newLevels)
    if (setParams && patchParams) {
      setParams((p) => ({
        ...p,
        ...patchParams,
        fondation: patchParams.fondation ? { ...p.fondation, ...patchParams.fondation } : p.fondation,
        planFlags: { ...(p.planFlags || {}), ...(patchParams.planFlags || {}) },
      }))
    }
    setProj({
      ...proj,
      titre: ex.titre || proj.titre,
      ville: ex.ville && typeof ex.ville === 'string' ? ex.ville : proj.ville,
    })
    setApplied(true)
  }

  const nbElems = ex ? ex.niveaux.reduce((s, n) => s + (n.pieces?.length || 0) + (n.murs?.length || 0) + (n.poteaux?.length || 0), 0) : 0
  const incertitudes = ex?.incertitudes || []

  return (
    <Card className="p-0" accent="lagune">
      <div className="px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle accent="lagune" className="mb-0">Lecture assistée du plan</SectionTitle>
          <Badge variant="lag"><ScanLine size={13} /> Détection automatique assistée</Badge>
        </div>
        <p className="text-[13px] text-muted mt-1.5">
          Déposez votre plan coté (PDF ou image) : murs, pièces, poteaux, niveaux et semelles
          sont extraits en données brutes, <b>que vous vérifiez et corrigez</b> avant tout calcul.
          Le devis n'est jamais généré directement depuis la lecture.
        </p>
      </div>

      <div className="p-5">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
          className={`cursor-pointer rounded-xl2 border-2 border-dashed px-5 py-8 text-center transition-all
            ${drag ? 'border-lagune bg-lagune-soft scale-[1.01]' : 'border-line-strong bg-muted-bg/60 hover:border-lagune hover:bg-lagune-soft/50'}`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])} />
          <div className="w-14 h-14 mx-auto rounded-2xl grid place-items-center text-white bg-gradient-to-br from-lagune to-indigo shadow-glow mb-3">
            <UploadCloud size={26} />
          </div>
          {file ? (
            <div className="inline-flex items-center gap-2 text-[13.5px] font-semibold">
              {file.type === 'application/pdf' ? <FileText size={16} className="text-laterite" /> : <ImageIcon size={16} className="text-lagune" />}
              {file.name}
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setEx(null); setError('') }} className="text-muted hover:text-laterite">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <p className="font-display font-semibold text-[15px]">Glissez votre plan ici, ou cliquez pour choisir</p>
              <p className="text-muted text-[12.5px] mt-1">PDF, PNG, JPG ou WEBP — jusqu'à {PLAN_MAX_MB} Mo. Une vue par zone (plan, coupe, fondations) donne les meilleurs résultats.</p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={analyser} disabled={!file || busy}>
            {busy ? <Loader size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {busy ? 'Lecture du plan…' : 'Lancer la lecture'}
          </Button>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <input type="checkbox" checked={verifier2e} onChange={(e) => setVerifier2e(e.target.checked)} className="w-3.5 h-3.5 accent-lagune" />
            Double lecture de contrôle (plus lent, plus fiable)
          </label>
          {file && !busy && <span className="text-[12.5px] text-muted">Le plan sert uniquement à produire votre devis.</span>}
        </div>

        {error && (
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl2 bg-laterite-soft border border-laterite/25 px-3.5 py-3 flex gap-2.5 text-[13px] text-laterite-deep">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <PlanHelp />
          </div>
        )}

        {/* ════════ ÉCRAN « VÉRIFIER LA LECTURE » (A10) ════════ */}
        {ex && !applied && (
          <div className="mt-4 rounded-xl2 border border-lagune/40 bg-card overflow-hidden animate-fade-up">
            <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-line bg-lagune-soft/60">
              <ClipboardCheck size={16} className="text-lagune-deep" />
              <b className="text-[13.5px] text-lagune-deep">Vérifier la lecture avant calcul</b>
              <span className="text-[12.5px] text-muted">
                — {ex.niveaux.length} niveau(x), {nbElems} élément(s) extraits · confiance globale : {ex.confiance || 'moyenne'}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-soleil-deep">
                <span className={`inline-block w-3 h-3 rounded ${lowCls} border border-soleil/40`} /> cote déduite / à contrôler
              </span>
            </div>

            {/* Incertitudes remontées par la lecture */}
            {incertitudes.length > 0 && (
              <div className="px-4 py-3 border-b border-line bg-soleil-soft/40">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-soleil-deep mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Incertitudes signalées par la lecture ({incertitudes.length})
                </p>
                <ul className="grid gap-1 text-[12.5px] text-ink list-disc pl-5">
                  {incertitudes.map((inc, i) => <li key={i}>{inc}</li>)}
                </ul>
              </div>
            )}

            <div className="p-4 grid gap-5 max-h-[520px] overflow-auto">
              {ex.toitTerrasseDetecte && (
                <p className="text-[12.5px] text-jade-deep bg-jade-soft border border-jade/25 rounded-[9px] px-3 py-2">
                  Toit-terrasse détecté sur le plan → le type de couverture sera réglé sur « toit-terrasse ».
                </p>
              )}

              {ex.niveaux.map((n, i) => (
                <div key={i} className="grid gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Nom du niveau</p>
                      <div className="w-[200px]"><Input value={n.nom || ''} onChange={(e) => upNiveau(i, 'nom', e.target.value)} className="py-1 text-[12.5px] font-semibold" /></div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">HSP (m)</p>
                      <CellNum value={n.HSP ?? ''} onChange={(v) => upNiveau(i, 'HSP', v)} low={n.HSP == null} />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Surf. plancher (m²)</p>
                      <CellNum value={n.surfPlancher ?? ''} onChange={(v) => upNiveau(i, 'surfPlancher', v)} w="w-[92px]" />
                    </div>
                  </div>

                  {/* Murs */}
                  {(n.murs || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1">Murs ({n.murs.length})</p>
                      <table className="text-[12px] min-w-[560px]">
                        <thead><tr className="text-muted text-[10.5px] uppercase">
                          <th className="text-left pr-2 pb-1">Désignation</th><th className="pr-2">Type</th><th className="pr-2">L (m)</th>
                          <th className="pr-2">H (m)</th><th className="pr-2">Position</th><th className="pr-2">Portes</th><th className="pr-2">Fen.</th><th />
                        </tr></thead>
                        <tbody>
                          {n.murs.map((m, j) => {
                            const low = m.confiance === 'basse' || m.type === 'inconnu'
                            return (
                              <tr key={j}>
                                <td className="pr-2 py-0.5"><div className="w-[170px]"><Input value={m.nom || ''} onChange={(e) => upItem(i, 'murs', j, 'nom', e.target.value)} className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} /></div></td>
                                <td className="pr-2">
                                  <div className="w-[160px]"><Select value={TYPES_MUR[m.type] ? m.type : 'agglo15'} onChange={(e) => upItem(i, 'murs', j, 'type', e.target.value)} className={`px-1.5 py-1 text-[12px] ${m.type === 'inconnu' ? lowCls : ''}`}>
                                    {Object.entries(TYPES_MUR).map(([k, t]) => <option key={k} value={k}>{t.lab}</option>)}
                                  </Select></div>
                                </td>
                                <td className="pr-2"><CellNum value={m.L ?? ''} onChange={(v) => upItem(i, 'murs', j, 'L', v)} low={low || m.L == null} /></td>
                                <td className="pr-2"><CellNum value={m.H ?? ''} onChange={(v) => upItem(i, 'murs', j, 'H', v)} low={m.H == null} w="w-[62px]" /></td>
                                <td className="pr-2">
                                  <div className="w-[104px]"><Select value={m.position || 'interieur'} onChange={(e) => upItem(i, 'murs', j, 'position', e.target.value)} className="px-1.5 py-1 text-[12px]">
                                    <option value="exterieur">Extérieur</option><option value="interieur">Intérieur</option><option value="mitoyen">Mitoyen</option>
                                  </Select></div>
                                </td>
                                <td className="pr-2"><CellNum value={m.portes ?? 0} onChange={(v) => upItem(i, 'murs', j, 'portes', v)} w="w-[52px]" /></td>
                                <td className="pr-2"><CellNum value={m.fenetres ?? 0} onChange={(v) => upItem(i, 'murs', j, 'fenetres', v)} w="w-[52px]" /></td>
                                <td><button onClick={() => rmItem(i, 'murs', j)} className="text-muted hover:text-laterite"><Trash2 size={13} /></button></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pièces */}
                  {(n.pieces || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1">Pièces ({n.pieces.length})</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {n.pieces.map((p, j) => {
                          const low = p.confiance === 'basse' || p.L == null || p.l == null
                          return (
                            <div key={j} className={`flex items-center gap-1.5 border border-line rounded-[8px] px-2 py-1 ${low ? lowCls : 'bg-card'}`}>
                              <div className="flex-1 min-w-0"><Input value={p.nom || ''} onChange={(e) => upItem(i, 'pieces', j, 'nom', e.target.value)} className="px-1 py-0.5 text-[12px] border-transparent bg-transparent" /></div>
                              <CellNum value={p.L ?? ''} onChange={(v) => upItem(i, 'pieces', j, 'L', v)} w="w-[56px]" />
                              <span className="text-muted text-[11px]">×</span>
                              <CellNum value={p.l ?? ''} onChange={(v) => upItem(i, 'pieces', j, 'l', v)} w="w-[56px]" />
                              <button onClick={() => rmItem(i, 'pieces', j)} className="text-muted hover:text-laterite shrink-0"><Trash2 size={12} /></button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Poteaux */}
                  {(n.poteaux || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1">Poteaux ({n.poteaux.length} groupe(s))</p>
                      <div className="flex flex-wrap gap-1.5">
                        {n.poteaux.map((pt, j) => {
                          const low = pt.confiance === 'basse' || pt.a == null || pt.b == null
                          return (
                            <div key={j} className={`flex items-center gap-1.5 border border-line rounded-[8px] px-2 py-1 text-[12px] ${low ? lowCls : 'bg-card'}`}>
                              <CellNum value={pt.nb ?? 1} onChange={(v) => upItem(i, 'poteaux', j, 'nb', v)} w="w-[48px]" />
                              <span className="text-muted">×</span>
                              <CellNum value={pt.a ?? ''} onChange={(v) => upItem(i, 'poteaux', j, 'a', v)} w="w-[56px]" />
                              <span className="text-muted">×</span>
                              <CellNum value={pt.b ?? ''} onChange={(v) => upItem(i, 'poteaux', j, 'b', v)} w="w-[56px]" />
                              <span className="text-muted">m · H</span>
                              <CellNum value={pt.H ?? ''} onChange={(v) => upItem(i, 'poteaux', j, 'H', v)} w="w-[56px]" />
                              <button onClick={() => rmItem(i, 'poteaux', j)} className="text-muted hover:text-laterite"><Trash2 size={12} /></button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Fondations */}
              {ex.fondations?.detectee && (ex.fondations.semelles || []).length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1">
                    Fondations détectées — semelles ({ex.fondations.semelles.length} type(s)), {ex.fondations.chainages?.length || 0} chaînage(s), {ex.fondations.longrines?.length || 0} longrine(s)
                  </p>
                  <table className="text-[12px]">
                    <thead><tr className="text-muted text-[10.5px] uppercase">
                      <th className="text-left pr-2 pb-1">Type</th><th className="pr-2">Nb</th><th className="pr-2">L (m)</th><th className="pr-2">l (m)</th><th className="pr-2">h béton (m)</th><th className="pr-2">Prof. (m)</th>
                    </tr></thead>
                    <tbody>
                      {ex.fondations.semelles.map((s, j) => {
                        const low = s.confiance === 'basse'
                        return (
                          <tr key={j}>
                            <td className="pr-2 py-0.5"><div className="w-[64px]"><Input value={s.type || ''} onChange={(e) => upSemelle(j, 'type', e.target.value)} className={`px-1.5 py-1 text-[12px] ${low ? lowCls : ''}`} /></div></td>
                            <td className="pr-2"><CellNum value={s.nb ?? 1} onChange={(v) => upSemelle(j, 'nb', v)} w="w-[52px]" /></td>
                            <td className="pr-2"><CellNum value={s.L ?? ''} onChange={(v) => upSemelle(j, 'L', v)} low={low || s.L == null} w="w-[62px]" /></td>
                            <td className="pr-2"><CellNum value={s.l ?? ''} onChange={(v) => upSemelle(j, 'l', v)} low={low || s.l == null} w="w-[62px]" /></td>
                            <td className="pr-2"><CellNum value={s.h ?? ''} onChange={(v) => upSemelle(j, 'h', v)} low={s.h == null} w="w-[62px]" /></td>
                            <td className="pr-2"><CellNum value={s.prof ?? ''} onChange={(v) => upSemelle(j, 'prof', v)} low={s.prof == null} w="w-[62px]" /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-line flex flex-wrap items-center gap-3 bg-card/50">
              <Button variant="jade" onClick={valider}>
                <Check size={15} /> Valider → calculer le métré
              </Button>
              <span className="text-[12px] text-muted">
                Rien n'est calculé avant cette validation. Vous pourrez encore tout ajuster dans « Niveaux & métré ».
              </span>
            </div>
          </div>
        )}

        {applied && (
          <div className="mt-4 rounded-xl2 border border-jade/30 bg-jade-soft px-4 py-3 flex items-center gap-2 animate-fade-up">
            <Check size={16} className="text-jade-deep" />
            <span className="text-[13px] font-semibold text-jade-deep">
              Lecture validée et reportée — poursuivez dans l'onglet « Niveaux & métré » (murs, fondations, ossature y sont éditables).
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
