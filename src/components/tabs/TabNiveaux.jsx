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
  metrerProjet, TOITURES, TYPES_MUR, TYPES_PLANCHER, PLANCHERS_CORPS_CREUX, CATEGORIES_MUR, MORTIER_DEFAUT,
  SYSTEMES_CONSTRUCTIFS, SYSTEMES_FONDATION, RATIOS_ACIER_DEFAUT, FONDATION_DEFAUT,
} from '../../lib/metre.js'
import LevelPlan from '../LevelPlan.jsx'

const DEF_PIECE = { nom: '', L: '', l: '', H: '', portes: '', fenetres: '' }
const DEF_MUR = { nom: '', type: 'agglo15', categorie: '', nb: 1, L: '', H: '', position: 'interieur', portes: '', fenetres: '', jonctionsT: '', jonctionsX: '', poteaux: '' }
const DEF_POTEAU = { nom: '', nb: 1, a: 0.3, b: 0.25, H: '' }
const DEF_POUTRE = { nom: '', nb: 1, L: '', b: 0.25, h: 0.4 }
const DEF_VOILE = { nom: '', nb: 1, L: '', ep: 0.2, H: '' }
const DEF_CV = { nom: '', nb: 1, a: 0.15, b: 0.15, H: '' }
const DEF_SEMELLE = { type: 'S1', nb: 1, L: '', l: '', h: 0.3, prof: 1.5 }
const DEF_PIGNON = { nom: '', nb: 1, L1: '', P1: '', L2: '', P2: '', type: 'agglo15' }
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

export default function TabNiveaux({ levels, setLevels, params, setParams, peutLire = true, onCredits }) {
  const { totaux, parNiveau, alertes } = useMemo(() => metrerProjet(levels, params), [levels, params])
  const [ouvertRatios, setOuvertRatios] = useState(false)
  const [ouvertMortier, setOuvertMortier] = useState(false)

  const setP = (k, v) => setParams({ ...params, [k]: v })
  const toiturePlan = params.plans?.toiture || {}
  const toitureAParametres = [toiturePlan.surfaceProjetee, toiturePlan.L, toiturePlan.l, toiturePlan.pente]
    .some((v) => Number(v) > 0) || (toiturePlan.pans || []).some((pan) => Number(pan.surface) > 0 || Number(pan.pente) > 0)
  const formeDallage = { actif: false, surface: '', epaisseur: '', eauCimentRatio: '', ...(params.formeDallage || {}) }
  const iRdcForme = Math.max(0, levels.findIndex((lv) => lv?.rez))
  const surfaceRdcForme = parNiveau[iRdcForme]?.surfPlancher || 0
  const setFormeDallage = (k, v) => setParams({ ...params, formeDallage: { ...formeDallage, [k]: v } })
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
            { k: 'largPoteau', lab: 'Larg. poteau déduite (m)' },
          ].map(({ k, lab }) => (
            <div key={k}>
              <Label>{lab}</Label>
              <NumIn value={params[k]} onChange={(v) => setP(k, v)} />
            </div>
          ))}
        </div>

        {/* Chaînage haut (ceinture sur murs porteurs) — fiche Eurocode §3.C */}
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <label className="flex items-center gap-2 font-medium text-ink">
            <input type="checkbox" checked={params.chainageHaut?.actif ?? true}
              onChange={(e) => setP('chainageHaut', { ...(params.chainageHaut || {}), actif: e.target.checked })} />
            Chaînage haut sur les murs porteurs (hors ossature)
          </label>
          <span className="text-[10.5px] text-muted">b (m)</span>
          <NumIn value={params.chainageHaut?.b ?? 0.2} onChange={(v) => setP('chainageHaut', { ...(params.chainageHaut || {}), b: v })} w="w-[64px]" />
          <span className="text-[10.5px] text-muted">h (m)</span>
          <NumIn value={params.chainageHaut?.h ?? 0.2} onChange={(v) => setP('chainageHaut', { ...(params.chainageHaut || {}), h: v })} w="w-[64px]" />
        </div>

        {/* Déduction de hauteur des murs : S = (Ld − Lp) × (Ht − Hs − Hbp − 2·ec) − Sb */}
        <Separator />
        <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <input type="checkbox" checked={!!params.deductionHauteur?.actif} onChange={(e) => setP('deductionHauteur', { ...(params.deductionHauteur || {}), actif: e.target.checked })} className="w-3.5 h-3.5 accent-laterite" />
          Déduire de la hauteur des murs : semelles, béton de propreté et chaînages
        </label>
        <p className="text-[11.5px] text-muted mt-1">À activer seulement si la hauteur saisie des murs est la hauteur <b>totale</b> (sinon un même élément serait déduit deux fois). Jamais appliqué au soubassement.</p>
        {params.deductionHauteur?.actif && (
          <div className="mt-2 flex flex-wrap gap-3">
            <div><Label>Hs semelles (m)</Label><NumIn value={params.deductionHauteur?.Hs} onChange={(v) => setP('deductionHauteur', { ...params.deductionHauteur, Hs: v })} w="w-[84px]" /></div>
            <div><Label>Hbp propreté (m)</Label><NumIn value={params.deductionHauteur?.Hbp} onChange={(v) => setP('deductionHauteur', { ...params.deductionHauteur, Hbp: v })} w="w-[84px]" /></div>
            <div><Label>ec chaînage (m)</Label><NumIn value={params.deductionHauteur?.ec} onChange={(v) => setP('deductionHauteur', { ...params.deductionHauteur, ec: v })} w="w-[84px]" ph="0,20" /></div>
            <div><Label>Nb chaînages</Label><NumIn value={params.deductionHauteur?.nChainages} onChange={(v) => setP('deductionHauteur', { ...params.deductionHauteur, nChainages: v })} w="w-[70px]" ph="2" /></div>
          </div>
        )}

        {/* Mortier de pose et ciment des joints : par type de bloc, modifiable */}
        <Separator />
        <button onClick={() => setOuvertMortier((o) => !o)} className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <ChevronDown size={14} className={`transition-transform ${ouvertMortier ? 'rotate-180' : ''}`} />
          Mortier de pose &amp; ciment des joints (par type de bloc)
        </button>
        {ouvertMortier && (
          <div className="mt-3 grid gap-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5"><input type="radio" name="mortierMode" checked={params.mortier?.mode === 'volume'} onChange={() => setP('mortier', { ...(params.mortier || {}), mode: 'volume' })} /> Volume de mortier × dosage</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="mortierMode" checked={(params.mortier?.mode ?? 'blocsParSac') === 'blocsParSac'} onChange={() => setP('mortier', { ...(params.mortier || {}), mode: 'blocsParSac' })} /> Règle « 1 sac pour N blocs » <span className="text-muted text-[11.5px]">(défaut : N = 70)</span></label>
            </div>
            <p className="text-[11.5px] text-muted">Règle de référence : 1 sac pour 70 agglos/briques standards (sacs arrondis à l'entier supérieur à la commande) ; elle varie avec la dimension du bloc, l'épaisseur des joints et la recette du mortier. Ajustez-la par type.</p>
            <div className="overflow-x-auto"><table className="text-[12.5px] min-w-[560px]">
              <thead><tr className="text-muted text-[11px] uppercase"><th className="text-left pr-3 py-1">Type de bloc</th><th className="pr-3">Blocs/m²</th><th className="pr-3">Pertes %</th><th className="pr-3">Mortier m³/m²</th><th className="pr-3">Dosage kg/m³</th><th className="pr-3">Blocs / sac</th></tr></thead>
              <tbody>{Object.entries(TYPES_MUR).map(([k, t]) => {
                const ov = params.mortier?.parType?.[k] || {}
                const setO = (champ, v) => setP('mortier', { ...(params.mortier || {}), parType: { ...(params.mortier?.parType || {}), [k]: { ...ov, [champ]: v } } })
                return (<tr key={k} className="border-t border-line/60"><td className="py-1 pr-3">{t.lab}</td>
                  {[['blocsM2', t.blocsM2], ['pertesPct', t.pertesKey === 'pertesBrique' ? (params.pertesBrique ?? 8) : (params.pertesAgglo ?? 7)], ['mortierM3M2', t.mortierM3M2], ['dosageKgM3', t.dosageKgM3], ['blocsParSac', t.blocsParSac ?? MORTIER_DEFAUT.blocsParSac]].map(([champ, def]) => (
                    <td key={champ} className="pr-3 py-1"><NumIn value={ov[champ]} onChange={(v) => setO(champ, v)} w="w-[78px]" ph={String(def)} step="0.001" /></td>))}
                </tr>)
              })}</tbody></table></div>
          </div>
        )}

        {/* Pignons de toiture : triangles de maçonnerie sous toiture, ajoutés au métré des murs */}
        <Separator />
        <p className="text-[13px] font-semibold text-ink mb-1">Pignons (murs triangulaires sous toiture)</p>
        <p className="text-[11.5px] text-muted mb-2">Avec un plan, saisissez les dimensions des pignons. Sans plan et avec une estimation de toiture à deux pans, ils sont calculés à partir de l’emprise et d’une pente de 30°. L1 = demi-portée horizontale (m), P1 = pente du versant (tan α, ex. 0,5 ≈ 27°). Pignon à une seule pente : laisser L2 vide.</p>
        <ListEditor
          items={params.plans?.toiture?.pignons || []}
          onChange={(l) => setP('plans', { ...(params.plans || {}), toiture: { ...(params.plans?.toiture || {}), pignons: l } })}
          def={DEF_PIGNON} addLabel="Ajouter un pignon"
          cols={[
            { k: 'nom', lab: 'Nom', type: 'text', w: 'w-[90px]', ph: 'Pignon nord' }, { k: 'nb', lab: 'Nb', w: 'w-[52px]' },
            { k: 'L1', lab: 'L1 (m)' }, { k: 'P1', lab: 'P1' }, { k: 'L2', lab: 'L2 (m)' }, { k: 'P2', lab: 'P2' },
          ]} />

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
              ['poteau', 'Poteaux'], ['poutre', 'Poutres'], ['linteau', 'Linteaux'], ['voile', 'Voiles'],
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
        <Label>Présence de toiture</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {[
            ['aucune', 'Pas de toiture', 'Le dernier plancher termine le bâtiment.'],
            ['plan', 'Une toiture existe', 'Déposez son plan ou validez une estimation avant le PDF.'],
            ['estimer', 'Estimer sans plan', 'Le type de couverture et les pignons seront estimés.'],
          ].map(([key, titre, aide]) => {
            const on = (params.toiturePresence || '') === key
            return (
              <button key={key} type="button" onClick={() => setP('toiturePresence', key)} aria-pressed={on}
                className={`min-h-[72px] rounded-[11px] border-2 px-3 py-2.5 text-left transition-all ${on ? 'border-soleil bg-soleil-soft shadow-soft' : 'border-line bg-card hover:border-soleil/50'}`}>
                <span className={`block text-[12.5px] font-semibold ${on ? 'text-soleil-deep' : 'text-ink'}`}>{titre}</span>
                <span className="mt-1 block text-[11px] text-muted">{aide}</span>
              </button>
            )
          })}
        </div>
        {!params.toiturePresence && <p className="mb-3 rounded-lg border border-soleil/30 bg-soleil-soft/40 px-3 py-2 text-[11.5px] text-soleil-deep">Sans choix, le dernier plancher est provisoirement traité comme toit-dalle. Confirmez « Pas de toiture » ou indiquez la toiture avant l’export.</p>}
        {params.toiturePresence === 'plan' && !toitureAParametres && <p className="mb-3 rounded-lg border border-line bg-muted-bg px-3 py-2 text-[11.5px] text-muted">Vous pouvez déposer le plan dans « Projet », ou continuer avec une estimation depuis « Export PDF » en confirmant l’exception toiture.</p>}
        {params.toiturePresence === 'aucune' && <div className="mb-3 max-w-[250px]"><Label>Hauteur des acrotères (m)</Label><NumIn value={params.acrotereHauteur ?? 0.4} onChange={(v) => setP('acrotereHauteur', v)} w="w-full" ph="0,40" /></div>}
        <p className="mb-3 text-[11.5px] text-muted">Un seul type de plancher est chiffré au dernier niveau : dalle pleine ou plancher creux, selon votre sélection. Les deux ne sont jamais cumulés.</p>
        <Label>Type de toiture / couverture <span className="text-muted font-normal">(confronté au plan lu — alerte si contradiction)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-fr items-stretch gap-2">
          {Object.entries(TOITURES).map(([key, t]) => {
            const on = (params.toiture || 'bac') === key
            return (
              <button key={key} type="button" onClick={() => setP('toiture', key)}
                className={`h-full min-h-[72px] flex flex-col justify-between text-left rounded-[11px] border-2 px-3 py-2.5 transition-all ${on ? 'border-soleil bg-soleil-soft shadow-soft' : 'border-line bg-card hover:border-soleil/50'}`}>
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
        {(params.planFlags?.prescriptionsFondation || []).length > 0 && (
          <div className="mb-4 rounded-[10px] border border-soleil/30 bg-soleil-soft/40 px-3.5 py-2.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-soleil-deep mb-1">Prescriptions lues sur le plan de fondation</p>
            <ul className="grid gap-1 text-[12.5px] list-disc pl-5">
              {params.planFlags.prescriptionsFondation.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <p className="text-[11.5px] text-muted mt-1.5">Informatif : ces mentions ne modifient aucun calcul. Contrôlez le fond de fouille avant bétonnage.</p>
          </div>
        )}
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

        {/* Terrassement : réemploi des terres, purge de sol impropre, apport extérieur — choix explicites */}
        {(() => {
          const T = { ...(fond.terrassement || {}) }
          const setT = (patch) => setF('terrassement', { ...T, ...patch })
          const ree = T.reemploi === false || T.reemploi?.actif === false ? { actif: false, taux: 1 } : { actif: true, taux: T.reemploi?.taux ?? 1 }
          const purge = !!T.bloquant || T.purge?.actif === true
          return (
            <div className="rounded-xl2 border border-line bg-muted-bg/40 p-3.5 mb-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2">Terrassement (déblais / remblais)</p>
              <div className="grid gap-2 text-[13px]">
                <label className="flex items-center gap-2"><input type="checkbox" checked={purge} onChange={(e) => setT({ bloquant: false, purge: { ...(T.purge || {}), actif: e.target.checked } })} className="w-3.5 h-3.5 accent-laterite" />
                  Purge de sol impropre (évacuation totale + apport extérieur)</label>
                {purge && (
                  <div><Label>Justification obligatoire (étude géotechnique, sol rencontré…)</Label>
                    <Input value={T.purge?.justification || ''} onChange={(e) => setT({ purge: { ...(T.purge || {}), actif: true, justification: e.target.value } })} className="px-2 py-1.5 text-[12.5px]" /></div>
                )}
                {!purge && (<>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={ree.actif} onChange={(e) => setT({ reemploi: { actif: e.target.checked, taux: ree.taux } })} className="w-3.5 h-3.5 accent-laterite" />
                    Réemploi des terres excavées en remblai <span className="text-muted text-[11.5px]">(sinon : évacuation totale)</span></label>
                  {ree.actif && (
                    <div className="flex items-center gap-2"><span className="text-[11px] text-muted">Part réemployable (0 à 1)</span>
                      <NumIn value={ree.taux} onChange={(v) => setT({ reemploi: { actif: true, taux: Math.min(1, v) } })} w="w-[70px]" step="0.05" /></div>
                  )}
                  {!ree.actif && (<>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={T.apportExterieur?.actif === true} onChange={(e) => setT({ apportExterieur: { ...(T.apportExterieur || {}), actif: e.target.checked } })} className="w-3.5 h-3.5 accent-laterite" />
                      Remblai par apport extérieur</label>
                    {T.apportExterieur?.actif && (
                      <div><Label>Justification de l'apport extérieur</Label>
                        <Input value={T.apportExterieur?.justification || ''} onChange={(e) => setT({ apportExterieur: { ...(T.apportExterieur || {}), actif: true, justification: e.target.value } })} className="px-2 py-1.5 text-[12.5px]" /></div>
                    )}
                  </>)}
                </>)}
              </div>
            </div>
          )
        })()}

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

      {/* ══ FORME DE DALLAGE (poste indépendant, compté une seule fois au RDC) ══ */}
      <Card className="p-5">
        <SectionTitle>Forme de dallage au RDC</SectionTitle>
        <p className="text-[12px] text-muted mb-3">Béton de propreté dosé à 150 kg/m³, indépendant de la dalle structurelle et compté une seule fois au rez-de-chaussée.</p>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={!!formeDallage.actif} onChange={(e) => setFormeDallage('actif', e.target.checked)} className="w-3.5 h-3.5 accent-laterite" />
          Inclure la forme de dallage
        </label>
        {formeDallage.actif && <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
          <div className="min-w-0"><Label>Surface (m²)</Label><NumIn value={formeDallage.surface} onChange={(v) => setFormeDallage('surface', v)} ph={`auto ${fmtNum(surfaceRdcForme, 2)} m²`} /></div>
          <div className="min-w-0"><Label>Épaisseur (m)</Label><NumIn value={formeDallage.epaisseur} onChange={(v) => setFormeDallage('epaisseur', v)} ph="ex. 0,10" /></div>
          <div className="min-w-0"><Label>Ratio eau/ciment (L/kg)</Label><NumIn value={formeDallage.eauCimentRatio} onChange={(v) => setFormeDallage('eauCimentRatio', v)} ph="à préciser" /></div>
        </div>}
        {formeDallage.actif && <p className="mt-2 text-[11.5px] text-muted">Dosage appliqué : 150 kg/m³; granulats selon le dosage B.P. (0,40 m³ de sable et 0,80 m³ de gravier par m³). Sans surface saisie, la surface nette du RDC est utilisée. Le prix par défaut de la forme reprend celui du B.P. (62 000 FCFA/m³) et apparaît séparément dans l’onglet Prix comme estimé, modifiable indépendamment du poste B.P. des fondations. Le ratio eau/ciment sert uniquement à estimer l’eau dans les matériaux.</p>}
      </Card>

      {/* ══ NIVEAUX ══ */}
      {levels.map((lv, li) => {
        const m = parNiveau[li] || {}
        return (
          <Card key={li} className="overflow-hidden">
            {/* En-tête niveau : nom, RDC, HSP, plancher (A3/A4) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end items-end gap-3 px-5 py-3 bg-muted-bg border-b border-line">
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:min-w-[180px]">
                <Label>Niveau</Label>
                <Input className="font-semibold" value={lv.nom || ''} onChange={(e) => upLevel(li, 'nom', e.target.value)} />
              </div>
              <label className="flex min-h-[40px] items-center gap-1.5 text-[13px] sm:pb-2">
                <input type="checkbox" checked={!!lv.rez} onChange={(e) => upLevel(li, 'rez', e.target.checked)} className="w-3.5 h-3.5 accent-ink" />
                RDC
              </label>
              <div className="min-w-0"><Label>HSP (m)</Label><NumIn value={lv.HSP} onChange={(v) => upLevel(li, 'HSP', v)} w="w-full sm:w-[76px]" ph={String(params.Hetage || 3)} /></div>
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:w-[210px]">
                <Label>Plancher haut du niveau</Label>
                <Select value={lv.plancher || (lv.dalle ? 'dallePleine' : 'aucun')} onChange={(e) => upLevel(li, 'plancher', e.target.value)} className="w-full text-[12.5px]">
                  {Object.entries(TYPES_PLANCHER).map(([k, t]) => <option key={k} value={k}>{t.lab}</option>)}
                </Select>
              </div>
              <div className="min-w-0"><Label>Surf. plancher (m²) <span className="text-muted font-normal">(vide = Σ pièces)</span></Label>
                <NumIn value={lv.surfPlancher} onChange={(v) => upLevel(li, 'surfPlancher', v)} w="w-full sm:w-[104px]" /></div>
              <div className="min-w-0"><Label>Trémies (m²)</Label><NumIn value={lv.tremies} onChange={(v) => upLevel(li, 'tremies', v)} w="w-full sm:w-[84px]" /></div>
              {/* Données propres au type de plancher (jamais devinées : saisies ou « à confirmer ») */}
              {PLANCHERS_CORPS_CREUX.includes(lv.plancher) && (<>
                {!TYPES_PLANCHER[lv.plancher]?.corpsCreux && (
                  <div className="col-span-2 min-w-0 sm:col-span-1 sm:w-[120px]"><Label>Entrevous (cm)</Label>
                    <Select value={lv.corpsCreux || ''} onChange={(e) => upLevel(li, 'corpsCreux', e.target.value === '' ? '' : +e.target.value)} className="w-full text-[12.5px]">
                      <option value="">À choisir</option><option value="15">15 (15+5)</option><option value="20">20 (20+5)</option>
                    </Select></div>
                )}
                <div className="min-w-0"><Label>Entraxe poutrelles (m)</Label><NumIn value={lv.entraxe} onChange={(v) => upLevel(li, 'entraxe', v)} w="w-full sm:w-[96px]" ph="à saisir" /></div>
                <div className="min-w-0"><Label>Portée poutrelle (m)</Label><NumIn value={lv.porteePoutrelle} onChange={(v) => upLevel(li, 'porteePoutrelle', v)} w="w-full sm:w-[96px]" ph="optionnel" /></div>
                <div className="min-w-0" title="Dimension du plancher PERPENDICULAIRE aux poutrelles : Np = L_perp ÷ entraxe + 1"><Label>L perp. poutrelles (m)</Label><NumIn value={lv.longueurPerpPoutrelles} onChange={(v) => upLevel(li, 'longueurPerpPoutrelles', v)} w="w-full sm:w-[96px]" ph="Np = L÷e+1" /></div>
                <div title="Hourdis : N = S dalle ÷ S hourdis (+ pertes)"><Label>Hourdis L × l (m)</Label><div className="flex gap-1">
                  <NumIn value={lv.dimHourdis?.L} onChange={(v) => upLevel(li, 'dimHourdis', { ...(lv.dimHourdis || {}), L: v })} w="w-[58px]" ph="0,60" />
                  <NumIn value={lv.dimHourdis?.l} onChange={(v) => upLevel(li, 'dimHourdis', { ...(lv.dimHourdis || {}), l: v })} w="w-[58px]" ph="0,20" /></div></div>
                <div className="min-w-0"><Label>Pertes hourdis (%)</Label><NumIn value={lv.pertesHourdis} onChange={(v) => upLevel(li, 'pertesHourdis', v)} w="w-full sm:w-[78px]" ph={String(params.pertesHourdis ?? 5)} /></div>
                <div className="col-span-2 min-w-0 sm:col-span-1 sm:w-[150px]"><Label>Finition sous-face</Label>
                  <Select value={lv.finitionSousFace || 'aucune'} onChange={(e) => upLevel(li, 'finitionSousFace', e.target.value)} className="w-full text-[12.5px]">
                    <option value="aucune">Aucune</option><option value="enduit">Enduit</option><option value="faux_plafond">Faux plafond</option>
                  </Select></div>
              </>)}
              {['dalleTP', 'dallePleine', 'nervuree'].includes(lv.plancher) && (
                <div className="min-w-0"><Label>Périmètre rives (m)</Label><NumIn value={lv.perimetre} onChange={(v) => upLevel(li, 'perimetre', v)} w="w-full sm:w-[96px]" ph="coffrage rives" /></div>
              )}
              {['dalleTP', 'dallePleine'].includes(lv.plancher) && (
                <div className="min-w-0"><Label>{lv.plancher === 'dalleTP' ? 'Épaisseur dalle sur terre-plein (m)' : 'Épaisseur dalle (m)'}</Label><NumIn value={lv.epDalle} onChange={(v) => upLevel(li, 'epDalle', v)} w="w-full sm:w-[96px]" ph={lv.plancher === 'dalleTP' ? 'ex. 0,10' : 'ex. 0,15'} /></div>
              )}
              {lv.plancher === 'nervuree' && (<>
                <div className="min-w-0"><Label>Entraxe nervures (m)</Label><NumIn value={lv.nervures?.entraxe} onChange={(v) => upLevel(li, 'nervures', { ...(lv.nervures || {}), entraxe: v })} w="w-full sm:w-[90px]" /></div>
                <div><Label>b × h nerv. (m)</Label><div className="flex gap-1">
                  <NumIn value={lv.nervures?.b} onChange={(v) => upLevel(li, 'nervures', { ...(lv.nervures || {}), b: v })} w="w-[60px]" />
                  <NumIn value={lv.nervures?.h} onChange={(v) => upLevel(li, 'nervures', { ...(lv.nervures || {}), h: v })} w="w-[60px]" /></div></div>
                <div className="min-w-0"><Label>Ép. table (m)</Label><NumIn value={lv.epDalle} onChange={(v) => upLevel(li, 'epDalle', v)} w="w-full sm:w-[80px]" /></div>
              </>)}
              {levels.length > 1 && (
                <button onClick={() => removeLevel(li)} className="col-span-2 justify-self-end text-muted hover:text-laterite sm:ml-auto sm:pb-2"><Trash2 size={15} /></button>
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
                      <NumIn value={mu.H} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, H: v }; upList(li, 'murs', n) }} w="w-[64px]" ph={mu.categorie === 'soubassement' ? 'obligatoire' : 'HSP'} />
                      <div className="w-[112px] shrink-0"><Select value={mu.position || 'interieur'} onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, position: e.target.value }; upList(li, 'murs', n) }} className="px-2 py-1.5 text-[12.5px]">
                        <option value="exterieur">Extérieur</option><option value="interieur">Intérieur</option><option value="mitoyen">Mitoyen</option>
                      </Select></div>
                      <div className="w-[150px] shrink-0" title="Catégorie d'ouvrage (métré séparé). Auto = déduite de la position et du bloc. Un soubassement exige longueur, hauteur et type de bloc saisis.">
                        <Select value={mu.categorie || ''} onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, categorie: e.target.value }; upList(li, 'murs', n) }} className="px-2 py-1.5 text-[12.5px]">
                          <option value="">Catégorie : auto</option>
                          {Object.entries(CATEGORIES_MUR).map(([k, c]) => <option key={k} value={k}>{c.lab}</option>)}
                        </Select></div>
                      {mu.categorie === 'soubassement' && (
                        <label className="flex items-center gap-1 text-[10.5px] text-muted"><input type="checkbox" checked={!!mu.enduitHydrofuge} onChange={(e) => { const n = [...lv.murs]; n[mi] = { ...mu, enduitHydrofuge: e.target.checked }; upList(li, 'murs', n) }} className="w-3 h-3" />Enduit hydrofuge</label>
                      )}
                      <span className="text-[10.5px] text-muted">Portes</span>
                      <NumIn value={mu.portes} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, portes: v }; upList(li, 'murs', n) }} w="w-[52px]" step="1" />
                      <span className="text-[10.5px] text-muted">Fen.</span>
                      <NumIn value={mu.fenetres} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, fenetres: v }; upList(li, 'murs', n) }} w="w-[52px]" step="1" />
                      <span className="text-[10.5px] text-muted" title="Branches de murs arrivant en T sur ce mur (correction ½·e par jonction)">Jonc. T</span>
                      <NumIn value={mu.jonctionsT} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, jonctionsT: v }; upList(li, 'murs', n) }} w="w-[48px]" step="1" />
                      <span className="text-[10.5px] text-muted" title="Croisements en X sur ce mur (correction e par jonction)">Jonc. X</span>
                      <NumIn value={mu.jonctionsX} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, jonctionsX: v }; upList(li, 'murs', n) }} w="w-[48px]" step="1" />
                      <span className="text-[10.5px] text-muted" title="Poteaux traversant ce mur (surface déduite de la maçonnerie)">Poteaux</span>
                      <NumIn value={mu.poteaux} onChange={(v) => { const n = [...lv.murs]; n[mi] = { ...mu, poteaux: v }; upList(li, 'murs', n) }} w="w-[48px]" step="1" />
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
              {(params.systeme === 'ossature' || params.systeme === 'mixte' || (lv.poteaux || []).length > 0 || (lv.poutres || []).length > 0 || (lv.voiles || []).length > 0 || (lv.chainagesV || []).length > 0) && (
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
                  <ListEditor titre="Voiles du niveau (plan de coffrage)"
                    items={lv.voiles || []} onChange={(l) => upList(li, 'voiles', l)} def={DEF_VOILE}
                    addLabel="Ajouter des voiles"
                    cols={[
                      { k: 'nom', lab: '', type: 'text', w: 'w-[80px]', ph: 'V1' },
                      { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'L', lab: 'L (m)' },
                      { k: 'ep', lab: 'Ép. (m)' }, { k: 'H', lab: 'H (m)', ph: 'HSP' },
                    ]} />
                  <ListEditor titre="Chaînages verticaux du niveau"
                    items={lv.chainagesV || []} onChange={(l) => upList(li, 'chainagesV', l)} def={DEF_CV}
                    addLabel="Ajouter des chaînages verticaux"
                    cols={[
                      { k: 'nom', lab: '', type: 'text', w: 'w-[80px]', ph: 'CV1' },
                      { k: 'nb', lab: 'Nb', w: 'w-[52px]' }, { k: 'a', lab: 'a (m)' },
                      { k: 'b', lab: 'b (m)' }, { k: 'H', lab: 'H (m)', ph: 'HSP' },
                    ]} />
                </div>
              )}
            </div>

            {/* Import plan de ce niveau */}
            <LevelPlan levelName={lv.nom} onApply={(data) => applyLevelPlan(li, data)} peutLire={peutLire} onCredits={onCredits} />

            {/* Résumé niveau */}
            {Object.keys(m).length > 0 && (
              <div className="px-5 pb-4">
                <Separator />
                <p className="text-[12px] text-muted font-semibold uppercase tracking-wide mb-2">Quantités calculées — {TYPES_PLANCHER[m.typePlancher]?.lab}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[12.5px]">
                  {[
                    ['Ldev', 'm', 'Développé murs'],
                    ['surfPlancher', 'm²', 'Surf. plancher'],
                    ['Smur', 'm²', 'Maçonnerie nette'],
                    ['volPoteaux', 'm³', 'BA poteaux'],
                    ['volPoutres', 'm³', 'BA poutres'],
                    ['volVoiles', 'm³', 'BA voiles'],
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
            ['volBAelevation', 'm³', 'BA élévation (pot./poutres/voiles/linteaux)'],
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
