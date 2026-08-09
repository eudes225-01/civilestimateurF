// src/components/tabs/TabNiveaux.jsx
// Onglet « Niveaux & métré » v2 — restructuration issue du rapport d'insuffisances :
//  · système constructif (murs porteurs / ossature / mixte)          (A2)
//  · fondations : filante / semelles isolées + longrines / radier    (A1)
//  · HSP et type de plancher PAR NIVEAU                              (A3/A4)
//  · murs typés (brique 10 / agglos 10-15-20) avec ouvertures        (A4/A6)
//  · poteaux & poutres par niveau, linteaux auto                     (A2)
//  · ratios d'acier par élément                                      (A5)
//  · alertes de cohérence affichées en tête                          (A7)
import React, { useMemo, useState } from 'react'
import { Plus, Trash2, AlertTriangle, AlertOctagon, Info, ChevronDown } from 'lucide-react'
import { Card, Input, Label, Button, Select, SectionTitle, Separator, Badge } from '../ui/index.jsx'
import { fmtNum } from '../../lib/format.js'
import {
  metrerProjet, TOITURES, TYPES_MUR, TYPES_PLANCHER,
  SYSTEMES_CONSTRUCTIFS, SYSTEMES_FONDATION, RATIOS_ACIER_DEFAUT, FONDATION_DEFAUT,
} from '../../lib/metre.js'
import LevelPlan from '../LevelPlan.jsx'

const DEF_PIECE = { nom: '', L: '', l: '', H: '', portes: '', fenetres: '' }
const DEF_MUR = { nom: '', type: 'agglo15', nb: 1, L: '', H: '', position: 'interieur', portes: '', fenetres: '' }
const DEF_POTEAU = { nom: '', nb: 1, a: 0.3, b: 0.25, H: '' }
const DEF_POUTRE = { nom: '', nb: 1, L: '', b: 0.25, h: 0.4 }
const DEF_SEMELLE = { type: 'S1', nb: 1, L: '', l: '', h: 0.3, prof: 1.5 }
const DEF_LIN = { nom: '', nb: 1, L: '', b: 0.2, h: 0.2, prof: 1.5 }

const ALERTE_STYLE = {
  bloquante: { Icon: AlertOctagon, cls: 'bg-laterite-soft border-laterite/30 text-laterite-deep' },
  attention: { Icon: AlertTriangle, cls: 'bg-soleil-soft border-soleil/30 text-soleil-deep' },
  info:      { Icon: Info,          cls: 'bg-lagune-soft border-lagune/25 text-lagune-deep' },
}

function NumIn({ value, onChange, w = 'w-full', step = '0.01', ph }) {
  return (
    <div className={`${w} shrink-0`}>
      <Input type="number" step={step} min="0" placeholder={ph} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
        className="px-2 py-1.5 text-[12.5px]" />
    </div>
  )
}

/** Éditeur générique de liste d'éléments (semelles, chaînages, poteaux…). */
function ListEditor({ titre, items, cols, def, onChange, addLabel = 'Ajouter' }) {
  const set = (i, k, v) => { const n = [...items]; n[i] = { ...n[i], [k]: v }; onChange(n) }
  const rm = (i) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div>
      {titre && <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted mb-1.5">{titre}</p>}
      <div className="grid gap-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            {cols.map((c) => (
              <div key={c.k} className="flex items-center gap-1">
                <span className="text-[10.5px] text-muted">{c.lab}</span>
                {c.type === 'text'
                  ? <div className={`${c.w || 'w-[110px]'} shrink-0`}><Input value={it[c.k] ?? ''} onChange={(e) => set(i, c.k, e.target.value)} className="px-2 py-1.5 text-[12.5px]" placeholder={c.ph} /></div>
                  : <NumIn value={it[c.k]} onChange={(v) => set(i, c.k, v)} w={c.w || 'w-[70px]'} ph={c.ph} />}
              </div>
            ))}
            <button onClick={() => rm(i)} className="text-muted hover:text-laterite"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onChange([...items, { ...def }])} className="mt-1.5">
        <Plus size={13} /> {addLabel}
      </Button>
    </div>
  )
}

export default function TabNiveaux({ levels, setLevels, params, setParams }) {
  const { totaux, parNiveau, alertes } = useMemo(() => metrerProjet(levels, params), [levels, params])
  const [ouvertRatios, setOuvertRatios] = useState(false)

  const setP = (k, v) => setParams({ ...params, [k]: v })
  const fond = { ...FONDATION_DEFAUT, ...(params.fondation || {}) }
  const setF = (k, v) => setParams({ ...params, fondation: { ...fond, [k]: v } })
  const setFObj = (k, sub, v) => setParams({ ...params, fondation: { ...fond, [k]: { ...(fond[k] || {}), [sub]: v } } })
  const ratios = { ...RATIOS_ACIER_DEFAUT, ...(params.ratiosAcier || {}) }
  const setRatio = (k, v) => setParams({ ...params, ratiosAcier: { ...ratios, [k]: v } })

  // ── manipulation des niveaux ──
  const upLevel = (i, k, v) => { const n = [...levels]; n[i] = { ...n[i], [k]: v }; setLevels(n) }
  const upList = (i, key, list) => upLevel(i, key, list)
  const addLevel = () => setLevels([...levels, {
    nom: `Niveau ${levels.length}`, rez: false, HSP: '', plancher: 'hourdis15',
    surfPlancher: '', tremies: '', pieces: [], murs: [], poteaux: [], poutres: [],
  }])
  const removeLevel = (i) => setLevels(levels.filter((_, idx) => idx !== i))

  const applyLevelPlan = (li, data) => {
    const n = [...levels]
    n[li] = {
      ...n[li],
      ...(data.nom ? { nom: data.nom } : {}),
      ...(data.HSP ? { HSP: data.HSP } : {}),
      ...(data.pieces?.length ? { pieces: data.pieces } : {}),
      ...(data.murs?.length ? { murs: data.murs } : {}),
      ...(data.poteaux?.length ? { poteaux: data.poteaux } : {}),
    }
    setLevels(n)
  }

  return (
    <div className="grid gap-5">

      {/* ══ ALERTES DE COHÉRENCE (A7) ══ */}
      {alertes.length > 0 && (
        <div className="grid gap-2">
          {alertes.map((a, i) => {
            const { Icon, cls } = ALERTE_STYLE[a.niveau] || ALERTE_STYLE.info
            return (
              <div key={i} className={`rounded-xl2 border px-3.5 py-2.5 flex gap-2.5 text-[13px] ${cls}`}>
                <Icon size={16} className="shrink-0 mt-0.5" />
                <span><b className="uppercase text-[10.5px] tracking-wide mr-1.5">{a.niveau}</b>{a.msg}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ══ SYSTÈME CONSTRUCTIF + PARAMÈTRES ══ */}
      <Card className="p-5">
        <SectionTitle>Système constructif & paramètres</SectionTitle>

        <Label>Système constructif du bâtiment</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          {Object.entries(SYSTEMES_CONSTRUCTIFS).map(([key, s]) => {
            const on = (params.systeme || 'murs') === key
            return (
              <button key={key} type="button" onClick={() => setP('systeme', key)}
                className={`text-left rounded-[11px] border-2 px-3 py-2.5 transition-all ${on ? 'border-indigo bg-indigo-soft shadow-soft' : 'border-line bg-card hover:border-indigo/50'}`}>
                <span className={`block text-[12.5px] font-semibold ${on ? 'text-indigo-deep' : 'text-ink'}`}>{s.lab}</span>
                <span className="block text-[11px] text-muted mt-0.5">
                  {key === 'murs' ? 'Maison simple, plain-pied' : key === 'ossature' ? 'La norme dès R+1 : poteaux & poutres à saisir' : 'Murs porteurs + poteaux ponctuels'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-[13px]">
          {[
            { k: 'Hetage', lab: "HSP par défaut (m)" },
            { k: 'epDalle', lab: 'Ép. dalle pleine (m)' },
            { k: 'pertesAgglo', lab: 'Pertes agglos (%)' },
            { k: 'pertesBrique', lab: 'Pertes briques (%)' },
            { k: 'K', lab: 'Coeff. majoration (K)' },
          ].map(({ k, lab }) => (
            <div key={k}>
              <Label>{lab}</Label>
              <NumIn value={params[k]} onChange={(v) => setP(k, v)} />
            </div>
          ))}
        </div>

        {/* Ratios d'acier par élément (A5) */}
        <Separator />
        <button onClick={() => setOuvertRatios((o) => !o)} className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          Ratios d'acier par élément (kg/m³)
          <ChevronDown size={14} className={`transition-transform ${ouvertRatios ? 'rotate-180' : ''}`} />
          <Badge variant="lag">détail acier au récapitulatif</Badge>
        </button>
        {ouvertRatios && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 text-[12.5px]">
            {[
              ['semelleFilante', 'Semelles filantes'], ['semelleIsolee', 'Semelles isolées'], ['chainage', 'Chaînages'], ['longrine', 'Longrines'], ['radier', 'Radier'],
              ['poteau', 'Poteaux'], ['poutre', 'Poutres'], ['linteau', 'Linteaux'],
              ['dallePleine', 'Dalle pleine'], ['dalleTP', 'Dalle terre-plein'], ['hourdisM2', 'Hourdis (kg/m²)'],
            ].map(([k, lab]) => (
              <div key={k}>
                <Label>{lab}</Label>
                <NumIn value={ratios[k]} onChange={(v) => setRatio(k, v)} step="1" />
              </div>
            ))}
          </div>
        )}

        {/* Toiture */}
        <Separator />
        <Label>Type de toiture / couverture <span className="text-muted font-normal">(confronté au plan lu — alerte si contradiction)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TOITURES).map(([key, t]) => {
            const on = (params.toiture || 'bac') === key
            return (
              <button key={key} type="button" onClick={() => setP('toiture', key)}
                className={`text-left rounded-[11px] border-2 px-3 py-2.5 transition-all ${on ? 'border-soleil bg-soleil-soft shadow-soft' : 'border-line bg-card hover:border-soleil/50'}`}>
                <span className={`block text-[12.5px] font-semibold ${on ? 'text-soleil-deep' : 'text-ink'}`}>{t.lab}</span>
                <span className="block text-[11px] text-muted mt-0.5">{t.pente} · ×{t.coef}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ══ FONDATIONS (A1) ══ */}
      <Card className="p-5" accent="laterite">
        <SectionTitle accent="laterite">Fondations</SectionTitle>
        <Label>Système de fondation</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          {Object.entries(SYSTEMES_FONDATION).map(([key, s]) => {
            const on = fond.type === key
            return (
              <button key={key} type="button" onClick={() => setF('type', key)}
                className={`text-left rounded-[11px] border-2 px-3 py-2.5 transition-all ${on ? 'border-laterite bg-laterite-soft shadow-soft' : 'border-line bg-card hover:border-laterite/50'}`}>
                <span className={`block text-[12.5px] font-semibold ${on ? 'text-laterite-deep' : 'text-ink'}`}>{s.lab}</span>
              </button>
            )
          })}
        </div>

        {/* Fouille en pleine masse (commune) */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" checked={!!fond.pleineMasse?.actif}
              onChange={(e) => setFObj('pleineMasse', 'actif', e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
            Fouille en pleine masse
          </label>
          {fond.pleineMasse?.actif && (
            <>
              <div><Label>Surface (m²) <span className="text-muted font-normal">(vide = emprise)</span></Label>
                <NumIn value={fond.pleineMasse.surface} onChange={(v) => setFObj('pleineMasse', 'surface', v)} w="w-[110px]" /></div>
              <div><Label>Profondeur (m)</Label>
                <NumIn value={fond.pleineMasse.prof} onChange={(v) => setFObj('pleineMasse', 'prof', v)} w="w-[90px]" /></div>
            </>
          )}
        </div>

        {fond.type === 'filante' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
            {[
              ['semL', 'Largeur semelle (m)'], ['semH', 'Hauteur semelle (m)'],
              ['profFouille', 'Prof. fouille (m)'], ['lineaire', 'Linéaire fondé (m) — vide = murs porteurs RDC'],
            ].map(([k, lab]) => (
              <div key={k}><Label>{lab}</Label><NumIn value={fond[k]} onChange={(v) => setF(k, v)} /></div>
            ))}
          </div>
        )}

        {fond.type === 'radier' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[13px]">
            <div><Label>Épaisseur radier (m)</Label><NumIn value={fond.epRadier} onChange={(v) => setF('epRadier', v)} /></div>
            <div><Label>Prof. fouille (m)</Label><NumIn value={fond.profFouille} onChange={(v) => setF('profFouille', v)} /></div>
            <div><Label>Ép. propreté (m)</Label><NumIn value={fond.epProprete} onChange={(v) => setF('epProprete', v)} /></div>
          </div>
        )}

        {fond.type === 'isolees' && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
              <div><Label>Prof. fouille défaut (m)</Label><NumIn value={fond.profFouille} onChange={(v) => setF('profFouille', v)} /></div>
              <div><Label>Ép. propreté (m)</Label><NumIn value={fond.epProprete} onChange={(v) => setF('epProprete', v)} /></div>
            </div>

            <ListEditor
              titre="Semelles isolées (dimensions béton ; la fouille utilise L × l × prof.)"
              items={fond.semelles || []} onChange={(l) => setF('semelles', l)} def={DEF_SEMELLE}
              addLabel="Ajouter un type de semelle"
              cols={[
                { k: 'type', lab: 'Type', type: 'text', w: 'w-[64px]', ph: 'S1' },
                { k: 'nb', lab: 'Nb', w: 'w-[56px]' },
                { k: 'L', lab: 'L (m)' }, { k: 'l', lab: 'l (m)' },
                { k: 'h', lab: 'h béton (m)' }, { k: 'prof', lab: 'Prof. (m)' },
              ]} />

            <ListEditor
              titre="Avant-poteaux (fûts en fondation)"
              items={fond.avantPoteaux || []} onChange={(l) => setF('avantPoteaux', l)}
              def={{ nb: 1, a: 0.3, b: 0.25, H: 1.0 }} addLabel="Ajouter des avant-poteaux"
              cols={[
                { k: 'nb', lab: 'Nb', w: 'w-[56px]' }, { k: 'a', lab: 'a (m)' },
                { k: 'b', lab: 'b (m)' }, { k: 'H', lab: 'H (m)' },
              ]} />

            <div className="grid lg:grid-cols-2 gap-4">
              <ListEditor
                titre="Chaînages (linéaires ; section BA b × h, fouille largeur 0,60 m)"
                items={fond.chainages || []} onChange={(l) => setF('chainages', l)} def={DEF_LIN}
                addLabel="Ajouter un chaînage"
                cols={[
                  { k: 'nom', lab: '', type: 'text', w: 'w-[100px]', ph: 'CH1 Axe A' },
                  { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'L', lab: 'L (m)' },
                  { k: 'b', lab: 'b (m)', w: 'w-[62px]' }, { k: 'h', lab: 'h (m)', w: 'w-[62px]' },
                ]} />
              <ListEditor
                titre="Longrines"
                items={fond.longrines || []} onChange={(l) => setF('longrines', l)} def={{ ...DEF_LIN, nom: '' }}
                addLabel="Ajouter une longrine"
                cols={[
                  { k: 'nom', lab: '', type: 'text', w: 'w-[100px]', ph: 'L1' },
                  { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'L', lab: 'L (m)' },
                  { k: 'b', lab: 'b (m)', w: 'w-[62px]' }, { k: 'h', lab: 'h (m)', w: 'w-[62px]' },
                ]} />
            </div>

            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-[13px]">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={!!fond.banche?.actif} onChange={(e) => setFObj('banche', 'actif', e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
                Gros béton banché sous longrines
              </label>
              {fond.banche?.actif && (<>
                <div><Label>b (m)</Label><NumIn value={fond.banche.b} onChange={(v) => setFObj('banche', 'b', v)} w="w-[70px]" /></div>
                <div><Label>h (m)</Label><NumIn value={fond.banche.h} onChange={(v) => setFObj('banche', 'h', v)} w="w-[70px]" /></div>
              </>)}
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={!!fond.moellons?.actif} onChange={(e) => setFObj('moellons', 'actif', e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
                Moellons sous chaînages
              </label>
              {fond.moellons?.actif && (<>
                <div><Label>b (m)</Label><NumIn value={fond.moellons.b} onChange={(v) => setFObj('moellons', 'b', v)} w="w-[70px]" /></div>
                <div><Label>h (m)</Label><NumIn value={fond.moellons.h} onChange={(v) => setFObj('moellons', 'h', v)} w="w-[70px]" /></div>
              </>)}
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={!!fond.herisson?.actif} onChange={(e) => setFObj('herisson', 'actif', e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
                Hérissonnage
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* ══ NIVEAUX ══ */}
      {levels.map((lv, li) => {
        const m = parNiveau[li] || {}
        return (
          <Card key={li} className="overflow-hidden">
            {/* En-tête niveau : nom, RDC, HSP, plancher (A3/A4) */}
            <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-muted-bg border-b border-line">
              <div className="min-w-[180px]">
                <Label>Niveau</Label>
                <Input className="font-semibold" value={lv.nom || ''} onChange={(e) => upLevel(li, 'nom', e.target.value)} />
              </div>
              <label className="flex items-center gap-1.5 text-[13px] pb-2">
                <input type="checkbox" checked={!!lv.rez} onChange={(e) => upLevel(li, 'rez', e.target.checked)} className="w-3.5 h-3.5 accent-ink" />
                RDC
              </label>
              <div><Label>HSP (m)</Label><NumIn value={lv.HSP} onChange={(v) => upLevel(li, 'HSP', v)} w="w-[76px]" ph={String(params.Hetage || 3)} /></div>
              <div className="w-[210px]">
                <Label>Plancher haut du niveau</Label>
                <Select value={lv.plancher || (lv.dalle ? 'dallePleine' : 'aucun')} onChange={(e) => upLevel(li, 'plancher', e.target.value)} className="text-[12.5px]">
                  {Object.entries(TYPES_PLANCHER).map(([k, t]) => <option key={k} value={k}>{t.lab}</option>)}
                </Select>
              </div>
              <div><Label>Surf. plancher (m²) <span className="text-muted font-normal">(vide = Σ pièces)</span></Label>
                <NumIn value={lv.surfPlancher} onChange={(v) => upLevel(li, 'surfPlancher', v)} w="w-[104px]" /></div>
              <div><Label>Trémies (m²)</Label><NumIn value={lv.tremies} onChange={(v) => upLevel(li, 'tremies', v)} w="w-[84px]" /></div>
              {levels.length > 1 && (
                <button onClick={() => removeLevel(li)} className="text-muted hover:text-laterite ml-auto pb-2"><Trash2 size={15} /></button>
              )}
            </div>

            <div className="p-5 grid gap-5">
              {/* Murs typés (A4) */}
              <div>
                <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">
                  Murs (type, longueur, hauteur, ouvertures) — mode précis
                </p>
                <div className="grid gap-1.5">
                  {(lv.murs || []).map((mu, mi) => (
                    <div key={mi} className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                      <div className="w-[150px] shrink-0"><Input value={mu.nom || ''} placeholder="Ex. : Façade sud" onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, nom: e.target.value }; upList(li, 'murs', n) }} className="px-2 py-1.5 text-[12.5px]" /></div>
                      <div className="w-[168px] shrink-0"><Select value={mu.type || 'agglo15'} onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, type: e.target.value }; upList(li, 'murs', n) }} className="px-2 py-1.5 text-[12.5px]">
                        {Object.entries(TYPES_MUR).map(([k, t]) => <option key={k} value={k}>{t.lab}</option>)}
                      </Select></div>
                      <span className="text-[10.5px] text-muted">Nb</span>
                      <NumIn value={mu.nb ?? 1} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, nb: v }; upList(li, 'murs', n) }} w="w-[52px]" step="1" />
                      <span className="text-[10.5px] text-muted">L</span>
                      <NumIn value={mu.L} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, L: v }; upList(li, 'murs', n) }} w="w-[70px]" />
                      <span className="text-[10.5px] text-muted">H</span>
                      <NumIn value={mu.H} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, H: v }; upList(li, 'murs', n) }} w="w-[64px]" ph="HSP" />
                      <div className="w-[112px] shrink-0"><Select value={mu.position || 'interieur'} onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, position: e.target.value }; upList(li, 'murs', n) }} className="px-2 py-1.5 text-[12.5px]">
                        <option value="exterieur">Extérieur</option><option value="interieur">Intérieur</option><option value="mitoyen">Mitoyen</option>
                      </Select></div>
                      <span className="text-[10.5px] text-muted">Portes</span>
                      <NumIn value={mu.portes} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, portes: v }; upList(li, 'murs', n) }} w="w-[52px]" step="1" />
                      <span className="text-[10.5px] text-muted">Fen.</span>
                      <NumIn value={mu.fenetres} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, fenetres: v }; upList(li, 'murs', n) }} w="w-[52px]" step="1" />
                      <button onClick={() => upList(li, 'murs', lv.murs.filter((_, idx) => idx !== mi))} className="text-muted hover:text-laterite"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => upList(li, 'murs', [...(lv.murs || []), { ...DEF_MUR }])} className="mt-1.5">
                  <Plus size={13} /> Ajouter un mur
                </Button>
                {!(lv.murs || []).length && (
                  <p className="text-[12px] text-muted mt-1">
                    Sans murs saisis, le calcul se rabat sur les pièces ci-dessous (périmètres en agglos 15 — mode simple, moins précis).
                  </p>
                )}
              </div>

              {/* Pièces (mode simple / surfaces) */}
              <div>
                <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">Pièces (mode simple & surface du niveau)</p>
                <div className="grid gap-2">
                  {(lv.pieces || []).map((pc, pi) => (
                    <div key={pi} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 items-end text-[13px]">
                      <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                        <Label>Nom de la pièce</Label>
                        <Input value={pc.nom} placeholder="Ex. : Séjour, Chambre 1…"
                          onChange={(e) => { const n = [...lv.pieces]; n[pi] = { ...pc, nom: e.target.value }; upList(li, 'pieces', n) }} />
                      </div>
                      {[['L', 'Long. (m)'], ['l', 'Larg. (m)'], ['H', 'Haut. (m)'], ['portes', 'Portes'], ['fenetres', 'Fenêtres']].map(([k, lab]) => (
                        <div key={k}>
                          <Label>{lab}</Label>
                          <NumIn value={pc[k]} onChange={(v) => { const n = [...lv.pieces]; n[pi] = { ...pc, [k]: v }; upList(li, 'pieces', n) }} />
                        </div>
                      ))}
                      <button onClick={() => upList(li, 'pieces', lv.pieces.filter((_, idx) => idx !== pi))} className="mb-0.5 text-muted hover:text-laterite self-end"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => upList(li, 'pieces', [...(lv.pieces || []), { ...DEF_PIECE }])} className="mt-1.5">
                  <Plus size={13} /> Ajouter une pièce
                </Button>
              </div>

              {/* Ossature (A2) */}
              {(params.systeme === 'ossature' || params.systeme === 'mixte' || (lv.poteaux || []).length > 0 || (lv.poutres || []).length > 0) && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <ListEditor titre="Poteaux & raidisseurs du niveau"
                    items={lv.poteaux || []} onChange={(l) => upList(li, 'poteaux', l)} def={DEF_POTEAU}
                    addLabel="Ajouter des poteaux"
                    cols={[
                      { k: 'nom', lab: '', type: 'text', w: 'w-[80px]', ph: 'P1' },
                      { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'a', lab: 'a (m)' },
                      { k: 'b', lab: 'b (m)' }, { k: 'H', lab: 'H (m)', ph: 'HSP' },
                    ]} />
                  <ListEditor titre="Poutres du niveau (linéaire × section)"
                    items={lv.poutres || []} onChange={(l) => upList(li, 'poutres', l)} def={DEF_POUTRE}
                    addLabel="Ajouter des poutres"
                    cols={[
                      { k: 'nom', lab: '', type: 'text', w: 'w-[80px]', ph: 'A1' },
                      { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'L', lab: 'L (m)' },
                      { k: 'b', lab: 'b (m)' }, { k: 'h', lab: 'h (m)' },
                    ]} />
                </div>
              )}
            </div>

            {/* Import plan de ce niveau */}
            <LevelPlan levelName={lv.nom} onApply={(data) => applyLevelPlan(li, data)} />

            {/* Résumé niveau */}
            {Object.keys(m).length > 0 && (
              <div className="px-5 pb-4">
                <Separator />
                <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">Quantités calculées — {TYPES_PLANCHER[m.typePlancher]?.lab}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[12.5px]">
                  {[
                    ['Ldev', 'm', 'Développé murs'],
                    ['surfPlancher', 'm²', 'Surf. plancher'],
                    ['Smur', 'm²', 'Maçonnerie nette'],
                    ['volPoteaux', 'm³', 'BA poteaux'],
                    ['volPoutres', 'm³', 'BA poutres'],
                    ['volLinteaux', 'm³', 'Linteaux (auto)'],
                    ['volPlancher', 'm³', 'Béton plancher'],
                  ].map(([k, u, lab]) => (
                    <div key={k} className="bg-muted-bg rounded-[8px] px-2.5 py-2">
                      <p className="text-muted text-[11px]">{lab}</p>
                      <p className="font-semibold">{fmtNum(m[k], 1)} {u}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )
      })}

      <Button variant="outline" onClick={addLevel} className="self-start">
        <Plus size={15} /> Ajouter un niveau supérieur
      </Button>

      {/* ══ TOTAUX PROJET ══ */}
      <Card className="p-5">
        <SectionTitle>Totaux projet</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-[13px]">
          {[
            ['volFouille', 'm³', 'Fouilles (toutes)'],
            ['volProprete', 'm³', 'Béton de propreté'],
            ['volBAfondation', 'm³', 'BA fondations'],
            ['volBAelevation', 'm³', 'BA élévation (pot./poutres/linteaux)'],
            ['volDalle', 'm³', 'Béton planchers'],
            ['volBA', 'm³', 'BA total'],
            ['Smur', 'm²', 'Maçonnerie nette (tous types)'],
            ['enduitInt', 'm²', 'Enduit intérieur'],
            ['enduitExt', 'm²', 'Enduit extérieur'],
            ['acierKg', 'kg', 'Acier HA (par élément)'],
            ['cimentSacs', 'sacs', 'Ciment estimé'],
            ['surfToiture', 'm²', 'Couverture / étanchéité'],
          ].map(([k, u, lab]) => (
            <div key={k} className="border border-line rounded-[9px] px-3 py-2.5 bg-card">
              <p className="text-muted text-[11.5px]">{lab}</p>
              <p className="font-semibold text-[15px] mt-0.5">{fmtNum(totaux[k], 1)} <span className="text-muted text-[11px]">{u}</span></p>
            </div>
          ))}
        </div>

        {/* Maçonnerie par type (A4) */}
        {Object.keys(totaux.parTypeMur || {}).length > 0 && (
          <>
            <Separator />
            <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">Maçonnerie par type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12.5px]">
              {Object.entries(totaux.parTypeMur).map(([t, v]) => (
                <div key={t} className="bg-muted-bg rounded-[8px] px-2.5 py-2">
                  <p className="text-muted text-[11px]">{TYPES_MUR[t]?.lab || t}</p>
                  <p className="font-semibold">{fmtNum(v.surf, 1)} m² · {v.blocs} blocs</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Détail acier (A5) */}
        {(totaux.acierDetail || []).length > 0 && (
          <>
            <Separator />
            <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">Acier par élément</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[12.5px]">
              {totaux.acierDetail.map((d, i) => (
                <div key={i} className="bg-muted-bg rounded-[8px] px-2.5 py-2">
                  <p className="text-muted text-[11px]">{d.lib}</p>
                  <p className="font-semibold">{fmtNum(d.q, 0)} kg</p>
                  <p className="text-[10.5px] text-muted font-mono">{d.formule}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
