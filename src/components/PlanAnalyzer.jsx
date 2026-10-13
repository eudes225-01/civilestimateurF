// src/components/PlanAnalyzer.jsx
// Lecture de plans par type : un dépôt par type de plan (fondation, vue en
// plan, coupe, plomberie, électricité, poutraison, toiture, coffrage) →
// catégorisation automatique de chaque vue → extraction propre au type →
// écran « VÉRIFIER LA LECTURE » → validation humaine → calcul par module.
// Rien n'est calculé avant la validation ; le devis n'est jamais généré
// directement depuis la lecture.
import React, { useState } from 'react'
import { Loader, Check, AlertTriangle, Wand2, ScanLine, Trash2, Lock } from 'lucide-react'
import { Card, Button, SectionTitle, Badge } from './ui/index.jsx'
import { analyzePlans, extractionToProject, PLAN_MAX_MB } from '../lib/planreader.js'
import PlanDeposits from './PlanDeposits.jsx'
import PlanReview from './PlanReview.jsx'
import PlanHelp from './PlanHelp.jsx'
import { plansManquants, PLANS_OBLIGATOIRES } from '../lib/planGate.js'

// `depots` / `setDepots` sont portés par App : l'écran suivant en dépend (plans obligatoires).
export default function PlanAnalyzer({ proj, setProj, setLevels, setParams, depots, setDepots }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [ex, setEx] = useState(null)
  const [applied, setApplied] = useState(false)

  const nbFichiers = Object.values(depots).reduce((s, l) => s + l.length, 0)
  const nbTypes = Object.values(depots).filter((l) => l.length).length

  const manquants = plansManquants(depots)
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
          <SectionTitle accent="lagune" className="mb-0">Lecture assistée des plans</SectionTitle>
          <Badge variant="lag"><ScanLine size={13} /> Catégorisation automatique par type de plan</Badge>
        </div>
        <p className="text-[13px] text-muted mt-1.5">
          Déposez chaque plan dans la case de son type. Chaque vue est reconnue d'après son cartouche et ses codes
          (SF, P<i>n</i>, EF, HSP, (16+4)…), puis lue avec l'extracteur et le calcul propres à son type.
          Vous <b>vérifiez et corrigez</b> toutes les données avant tout calcul ; le devis n'est jamais généré directement depuis la lecture.
          Un plan déposé dans la mauvaise case est reclassé automatiquement.
        </p>
      </div>

      <div className="p-5">
        <PlanDeposits depots={depots} setDepots={changerDepots} disabled={busy} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={analyser} disabled={!nbFichiers || busy}>
            {busy ? <Loader size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {busy ? 'Lecture des plans…' : `Lancer la lecture${nbFichiers ? ` (${nbFichiers} plan${nbFichiers > 1 ? 's' : ''}, ${nbTypes} type${nbTypes > 1 ? 's' : ''})` : ''}`}
          </Button>
          {nbFichiers > 0 && !busy && (
            <Button variant="ghost" onClick={() => changerDepots({})}><Trash2 size={14} /> Tout retirer</Button>
          )}
          {!nbFichiers && <span className="text-[12.5px] text-muted">Déposez vos plans (jusqu'à {PLAN_MAX_MB} Mo chacun).</span>}
          {nbFichiers > 0 && !busy && <span className="text-[12.5px] text-muted">Le plan sert uniquement à produire votre devis. Double lecture active.</span>}
        </div>

        {/* ── Plans obligatoires : condition pour passer à l'étape suivante ── */}
        <div className={`mt-4 rounded-xl2 border px-4 py-3 ${manquants.length ? 'border-laterite/30 bg-laterite-soft/50' : 'border-jade/30 bg-jade-soft'}`}>
          <p className={`flex items-center gap-2 text-[12.5px] font-semibold ${manquants.length ? 'text-laterite-deep' : 'text-jade-deep'}`}>
            {manquants.length ? <Lock size={14} /> : <Check size={14} />}
            {manquants.length
              ? `Étape suivante verrouillée — il manque ${manquants.length} plan${manquants.length > 1 ? 's' : ''} obligatoire${manquants.length > 1 ? 's' : ''}`
              : 'Tous les plans obligatoires sont déposés — vous pouvez passer à l\'étape suivante'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {PLANS_OBLIGATOIRES.map((p) => {
              const manque = manquants.some((m) => m.cle === p.cle)
              return (
                <li key={p.cle} className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full border ${manque ? 'bg-card border-laterite/30 text-laterite-deep' : 'bg-card border-jade/30 text-jade-deep'}`}>
                  {manque ? <AlertTriangle size={11} /> : <Check size={11} />}{p.lab}
                </li>
              )
            })}
          </ul>
        </div>

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
              Lecture validée et reportée — poursuivez dans l'onglet « Niveaux &amp; métré » (murs, fondations, ossature, voiles y sont éditables) ; plomberie, électricité et toiture sont chiffrées dans le DQE.
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
