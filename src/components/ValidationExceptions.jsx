// src/components/ValidationExceptions.jsx
// Écran de validation du plan d'amélioration « lecture de plans » :
//  • un score de couverture (« 92 % lu ; pente de toiture et profondeur de fouille à confirmer ») ;
//  • UNIQUEMENT les exceptions (données ambiguës ou absentes), regroupées par sujet ;
//  • pour chacune, la valeur détectée / appliquée et une alternative (corriger ou confirmer) ;
//  • la trace de confirmation (qui, quand, quelle valeur) est enregistrée dans les paramètres du
//    projet (params.confirmations). Elle n'est JAMAIS envoyée dans le PDF remis au client.
// Une exception « à confirmer » bloque l'export ; une valeur par défaut confirmée ne le bloque plus.
import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, Undo2, ShieldCheck, PencilLine } from 'lucide-react'
import { Card, Button, Input, SectionTitle, Badge } from './ui/index.jsx'
import { enregistrerConfirmation, retirerConfirmation } from '../lib/metre.js'
import { useAuth } from '../lib/auth.jsx'
import { fmtCFA } from '../lib/format.js'

const ETAT = {
  a_confirmer: { lab: 'À confirmer', cls: 'bg-laterite-soft text-laterite-deep border-laterite/30' },
  confirmee:   { lab: 'Confirmée',   cls: 'bg-jade-soft text-jade-deep border-jade/30' },
  corrigee:    { lab: 'Corrigée',    cls: 'bg-lagune-soft text-lagune-deep border-lagune/30' },
  detectee:    { lab: 'Détectée',    cls: 'bg-jade-soft text-jade-deep border-jade/30' },
}
const STATUT_LOT = {
  lu:       { lab: 'Lu',        cls: 'bg-jade-soft text-jade-deep border-jade/30' },
  confirme: { lab: 'Confirmé',  cls: 'bg-jade-soft text-jade-deep border-jade/30' },
  defaut:   { lab: 'Par défaut', cls: 'bg-soleil-soft text-soleil-deep border-soleil/30' },
  partiel:  { lab: 'Partiel',   cls: 'bg-soleil-soft text-soleil-deep border-soleil/30' },
  absent:   { lab: 'Absent',    cls: 'bg-laterite-soft text-laterite-deep border-laterite/30' },
  exclu:    { lab: 'Exclu',     cls: 'bg-muted-bg text-muted border-line' },
}

const fmtValeur = (v) => String(v).replace('.', ',')

/** Bandeau de couverture : score + résumé, lots en pastilles. */
export function CouvertureBandeau({ couverture }) {
  if (!couverture || couverture.vide) return null
  const s = couverture.score
  const barre = s >= 90 ? 'bg-jade' : s >= 60 ? 'bg-soleil' : 'bg-laterite'
  return (
    <div className="rounded-xl2 border border-line bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">Couverture de la lecture : <span className="font-mono">{couverture.resume}</span></p>
        <span className="text-[12px] font-mono text-muted">{s} %</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted-bg overflow-hidden" role="progressbar" aria-valuenow={s} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${barre} transition-all duration-500`} style={{ width: `${s}%` }} />
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {couverture.lots.map((l) => {
          const st = STATUT_LOT[l.statut] || STATUT_LOT.lu
          return <li key={l.cle} className={`text-[11.5px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{l.lab} · {st.lab}</li>
        })}
      </ul>
    </div>
  )
}

function Exception({ x, onConfirmer, onCorriger, onAnnuler, montant }) {
  const [val, setVal] = useState('')
  const [edition, setEdition] = useState(false)
  const st = ETAT[x.etat] || ETAT.a_confirmer
  const corrigeable = x.mode === 'corriger'
  const valide = Number(String(val).replace(',', '.')) > 0

  return (
    <li className="rounded-xl2 border border-line bg-card px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] leading-snug flex-1 min-w-[240px]">{x.question}</p>
        <span className={`shrink-0 text-[10.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${st.cls}`}>{st.lab}</span>
      </div>

      {x.etat === 'a_confirmer' && montant > 0 && (
        <p className="mt-1.5 text-[11.5px] text-soleil-deep font-semibold">Montant concerné dans le devis : {fmtCFA(montant)} HT</p>
      )}

      {x.etat === 'a_confirmer' ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="accent" onClick={() => onConfirmer(x)}>
            <CheckCircle2 size={14} /> {x.confirmerLabel || (corrigeable ? 'Confirmer cette valeur' : 'Confirmer')}
          </Button>
          {corrigeable && !edition && (
            <Button size="sm" variant="ghost" onClick={() => setEdition(true)}><PencilLine size={14} /> {x.alternative}</Button>
          )}
          {corrigeable && edition && (
            <span className="inline-flex items-center gap-2">
              <Input type="number" min="0" step="0.05" value={val} onChange={(e) => setVal(e.target.value)}
                className="w-[110px] text-right" placeholder={x.unite || ''} aria-label={x.alternative} />
              <span className="text-[12px] text-muted">{x.unite}</span>
              <Button size="sm" disabled={!valide} onClick={() => onCorriger(x, Number(String(val).replace(',', '.')))}>Appliquer</Button>
            </span>
          )}
          {!corrigeable && x.alternative && <span className="text-[12px] text-muted">ou : {x.alternative.toLowerCase()}</span>}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span>
            {x.etat === 'corrigee' ? `Valeur retenue : ${fmtValeur(x.valeurRetenue)} ${x.unite || ''}` : 'Valeur par défaut acceptée'}
            {x.date ? ` · ${new Date(x.date).toLocaleDateString('fr-FR')}` : ''}
          </span>
          <button type="button" onClick={() => onAnnuler(x)} className="inline-flex items-center gap-1 hover:text-ink"><Undo2 size={12} /> Annuler</button>
        </div>
      )}
    </li>
  )
}

/**
 * @param {{couverture: Object, setParams: Function, montants?: Array, titre?: string}} props
 * `montants` : sortie de montantsIncomplets(dqe, couverture) — montants du devis concernés.
 */
export default function ValidationExceptions({ couverture, setParams, montants = [], titre = 'Validation avant export' }) {
  const { session } = useAuth()
  const utilisateur = session?.user?.email || session?.user?.id || null
  if (!couverture || couverture.vide) return null

  const exceptions = couverture.aConfirmer
  const restantes = exceptions.filter((x) => x.etat === 'a_confirmer')
  const montantDe = (cle) => montants.find((m) => m.cle === cle)?.montant || 0

  const maj = (fn) => setParams((p) => ({ ...p, confirmations: fn(p.confirmations || {}) }))
  const confirmer = (x) => maj((c) => enregistrerConfirmation(c, x.cle, { utilisateur, valeurAppliquee: x.valeurDetectee?.profFouille ?? x.valeurDetectee?.HSP ?? x.valeurDetectee?.coef ?? null }))
  const corriger = (x, valeur) => maj((c) => enregistrerConfirmation(c, x.cle, { utilisateur, valeur }))
  const annuler = (x) => maj((c) => retirerConfirmation(c, x.cle))

  // Regroupement par sujet : une seule étape de validation, pas une fiche de saisie.
  const sujets = []
  exceptions.forEach((x) => { let g = sujets.find((s) => s.sujet === x.sujet); if (!g) { g = { sujet: x.sujet, items: [] }; sujets.push(g) } g.items.push(x) })

  return (
    <Card className="p-5 grid gap-4" accent={restantes.length ? 'soleil' : 'jade'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle accent={restantes.length ? 'soleil' : 'jade'} className="mb-0">{titre}</SectionTitle>
        {restantes.length
          ? <Badge variant="lat"><AlertTriangle size={13} /> {restantes.length} exception(s) à confirmer</Badge>
          : <Badge variant="ok"><ShieldCheck size={13} /> Aucune donnée à confirmer</Badge>}
      </div>

      <CouvertureBandeau couverture={couverture} />

      {sujets.length > 0 && (
        <div className="grid gap-4">
          <p className="text-[12.5px] text-muted">
            Seules les données ambiguës ou absentes sont listées : les quantités lues sur vos plans ne sont pas à ressaisir.
            {restantes.length > 0 && ' L\'export du PDF est disponible dès que toutes les exceptions sont confirmées ou corrigées.'}
          </p>
          {sujets.map((g) => (
            <section key={g.sujet}>
              <h3 className="font-display font-semibold text-[13.5px] mb-2">{g.sujet}</h3>
              <ul className="grid gap-2">
                {g.items.map((x) => (
                  <Exception key={x.cle} x={x} montant={montantDe(x.cle)} onConfirmer={confirmer} onCorriger={corriger} onAnnuler={annuler} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}
