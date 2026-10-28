// src/components/PlanAnalyzer.jsx
// Lecture de plans par type : un dépôt par type de plan (fondation, vue en
// plan, coupe, plomberie, électricité, poutraison, toiture, coffrage) →
// catégorisation automatique de chaque vue → extraction propre au type →
// écran « VÉRIFIER LA LECTURE » → validation humaine → calcul par module.
// Rien n'est calculé avant la validation ; le devis n'est jamais généré
// directement depuis la lecture.
import React, { useState } from 'react'
import { Loader, Check, AlertTriangle, Wand2, ScanLine, Trash2, Lock, Crown } from 'lucide-react'
import { EtiquettePremium } from './StatutBadge.jsx'
import { Card, Button, SectionTitle, Badge } from './ui/index.jsx'
import { analyzePlans, extractionToProject, PLAN_MAX_MB } from '../lib/planreader.js'
import PlanDeposits from './PlanDeposits.jsx'
import PlanReview from './PlanReview.jsx'
import PlanHelp from './PlanHelp.jsx'
import VideoGuideIFC from './VideoGuideIFC.jsx'
import { plansAbsents } from '../lib/planGate.js'
import { CouvertureBandeau } from './ValidationExceptions.jsx'

// `depots` / `setDepots` sont portés par App. Aucun plan n'est obligatoire : `couverture` (moteur) mesure ce qui est lu.
// `premium` : le dépôt de plans est une fonction Premium (ou admin). Sans cela, les dépôts sont verrouillés
// et le bouton « Passer Premium » (`onPremium`) ouvre le récapitulatif de l'abonnement.
export default function PlanAnalyzer({ proj, setProj, setLevels, setParams, couverture, depots, setDepots, premium = true, onPremium }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [ex, setEx] = useState(null)
  const [applied, setApplied] = useState(false)

  const nbFichiers = Object.values(depots).reduce((s, l) => s + l.length, 0)
  const nbTypes = Object.values(depots).filter((l) => l.length).length

  const absents = plansAbsents(depots)
  const changerDepots = (up) => { setEx(null); setApplied(false); setError(''); setDepots(up) }

  const analyser = async () => {
    if (!nbFichiers) return
    setBusy(true); setError(''); setEx(null); setApplied(false); setProgress({ fait: 0, total: nbFichiers, message: 'Préparation…' })
    const res = await analyzePlans(depots, { verifier: true, onProgress: setProgress })
    setBusy(false); setProgress(null)
    if (!res.ok) { setError(res.message); return }
    const data = res.data
    // Plan de plomberie déposé mais rien d'exploitable lu : on ouvre quand même le bloc,
    // vide, pour que l'utilisateur renseigne les appareils et canalisations.
    if ((depots.plomberie || []).length && !data.plomberie) {
      data.plomberie = { appareils: [], reseaux: [], regards: [] }
      data.incertitudes = [...(data.incertitudes || []), 'Plan de plomberie déposé mais aucune donnée n\'a pu y être lue : renseignez les appareils et les canalisations dans le bloc « Plomberie et assainissement ».']
    }
    if ((depots.ferraillage || []).length) {
      data.incertitudes = [...(data.incertitudes || []), 'Plan de ferraillage déposé : conservé comme pièce du dossier, il n\'est pas lu automatiquement. Les ratios d\'acier restent ceux des paramètres du métré.']
    }
    setEx(data)
  }

  // Validation → calcul (rien n'est calculé avant ce clic)
  const valider = () => {
    if (!ex) return
    const { levels, patchParams } = extractionToProject(ex)
    if (levels.length) setLevels(levels)
    setParams((p) => ({
      ...p,
      ...patchParams,
      fondation: patchParams.fondation ? { ...p.fondation, ...patchParams.fondation } : p.fondation,
      planFlags: { ...(p.planFlags || {}), ...(patchParams.planFlags || {}) },
      plans: { ...(p.plans || {}), ...(patchParams.plans || {}) },
      // Nouvelle lecture validée = nouvelles données : les confirmations précédentes (valeurs par défaut
      // acceptées, corrections) ne s'appliquent plus et les exceptions sont réévaluées.
      confirmations: {},
    }))
    setProj({
      ...proj,
      titre: ex.titre || proj.titre,
      ville: ex.ville && typeof ex.ville === 'string' ? ex.ville : proj.ville,
    })
    setApplied(true)
  }

  return (
    <Card className="p-0" accent="lagune">
      <div className="px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle accent="lagune" className="mb-0 inline-flex items-center gap-2">Lecture assistée des plans <EtiquettePremium /></SectionTitle>
          <Badge variant="lag"><ScanLine size={13} /> Catégorisation automatique par type de plan</Badge>
        </div>
        <p className="text-[13px] text-muted mt-1.5">
          Déposez votre dossier <b>sans classer les planches</b>, avec en plus, si vous l'avez, une <b>maquette IFC</b> (facultative) qui facilite la lecture des mesures de la vue en plan. Chaque vue est reconnue d'après son cartouche et ses codes
          (SF, P<i>n</i>, EF, HSP, (16+4)…), puis lue avec l'extracteur et le calcul propres à son type.
          Vous <b>vérifiez et corrigez</b> la lecture avant tout calcul ; le devis n'est jamais généré directement depuis la lecture.
          Aucun plan n'est obligatoire : seules les données manquantes ou ambiguës vous seront demandées.
        </p>
      </div>

      <div className="p-5">
        {!premium && (
          <div className="mb-4 rounded-xl2 border border-soleil/40 bg-soleil-soft/60 px-4 py-3.5 flex flex-wrap items-center gap-3">
            <span className="shrink-0 w-9 h-9 rounded-full bg-soleil-soft grid place-items-center text-soleil-deep border border-soleil/30"><Lock size={17} /></span>
            <p className="flex-1 min-w-[220px] text-[12.5px] leading-snug">
              <b>Dépôt de plans : fonction Premium.</b> Sans abonnement, saisissez vos dimensions dans l'onglet « Niveaux &amp; métré » :
              le métré, les prix et le DQE restent gratuits.
            </p>
            <Button variant="accent" size="sm" onClick={onPremium}><Crown size={14} /> Passer Premium</Button>
          </div>
        )}

        {/* Vidéo facultative, annoncée avant les dépôts (démarrage automatique à la première visite) */}
        {premium && <VideoGuideIFC />}

        <PlanDeposits depots={depots} setDepots={changerDepots} disabled={busy || !premium} verrouille={!premium} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={analyser} disabled={!premium || !nbFichiers || busy}>
            {busy ? <Loader size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {busy ? 'Lecture des plans…' : `Lancer la lecture${nbFichiers ? ` (${nbFichiers} plan${nbFichiers > 1 ? 's' : ''}, ${nbTypes} type${nbTypes > 1 ? 's' : ''})` : ''}`}
          </Button>
          {nbFichiers > 0 && !busy && (
            <Button variant="ghost" onClick={() => changerDepots({})}><Trash2 size={14} /> Tout retirer</Button>
          )}
          {premium && !nbFichiers && <span className="text-[12.5px] text-muted">Déposez vos plans (jusqu'à {PLAN_MAX_MB} Mo chacun).</span>}
          {nbFichiers > 0 && !busy && <span className="text-[12.5px] text-muted">Le plan sert uniquement à produire votre devis. Double lecture active.</span>}
        </div>

        {/* ── Plans recommandés : information seulement, jamais un verrou ── */}
        {premium && nbFichiers > 0 && absents.length > 0 && (
          <p className="mt-4 text-[12px] text-muted">
            Non déposés (facultatif) : {absents.map((p) => p.lab).join(', ')}. Les données correspondantes pourront vous être demandées dans l'étape de validation.
          </p>
        )}

        {couverture && !couverture.vide && <div className="mt-4"><CouvertureBandeau couverture={couverture} /></div>}

        {busy && progress && (
          <div className="mt-4 rounded-xl2 border border-lagune/30 bg-lagune-soft/50 px-4 py-3">
            <div className="flex items-center gap-2 text-[12.5px] text-lagune-deep font-semibold">
              <Loader size={14} className="animate-spin" /> {progress.message}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-lagune/15 overflow-hidden">
              <div className="h-full bg-lagune transition-all duration-500" style={{ width: `${Math.round((progress.fait / Math.max(1, progress.total)) * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted">Plan {Math.min(progress.fait + 1, progress.total)} / {progress.total} — la lecture d'une planche complète peut prendre une à deux minutes.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl2 bg-laterite-soft border border-laterite/25 px-3.5 py-3 flex gap-2.5 text-[13px] text-laterite-deep">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <PlanHelp />
          </div>
        )}

        {ex && !applied && <PlanReview ex={ex} setEx={setEx} onValider={valider} />}

        {applied && (
          <div className="mt-4 rounded-xl2 border border-jade/30 bg-jade-soft px-4 py-3 flex items-center gap-2 animate-fade-up">
            <Check size={16} className="text-jade-deep shrink-0" />
            <span className="text-[13px] font-semibold text-jade-deep">
              Lecture validée et reportée — les exceptions à confirmer (s'il y en a) s'affichent dans l'onglet « DQE » ; murs, fondations, ossature et voiles restent éditables dans « Niveaux &amp; métré » ; plomberie, électricité et toiture sont chiffrées dans le DQE.
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
