// src/components/Paywall.jsx
// Écran affiché à la place du DQE et de l'export PDF tant que l'utilisateur n'a pas d'abonnement actif.
import React from 'react'
import { Lock, Check, Loader, RefreshCw } from 'lucide-react'
import { Card, Button } from './ui/index.jsx'

const fmtXof = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`

const AVANTAGES = [
  'DQE complet : quantités, prix unitaires et totaux HT / TVA / TTC',
  'Sous-détail des prix (BPU) et récapitulatif des métrés',
  'Export PDF professionnel à votre marque (logo, mentions légales)',
  'Lecture automatique des plans déposés',
]

export default function Paywall({ etape, abo, onRetour }) {
  const { etat, chargement, erreur, paiementEnCours, verification, payer, rafraichir } = abo
  const prix = etat?.abonnement
  const indisponible = !chargement && !etat // état illisible : on reste verrouillé
  const peutPayer = !!etat?.paiementDisponible && !indisponible

  return (
    <Card className="max-w-[560px] mx-auto p-7 text-center" accent="laterite">
      <div className="mx-auto w-12 h-12 rounded-full bg-laterite-soft grid place-items-center text-laterite-deep">
        <Lock size={22} />
      </div>
      <h2 className="mt-4 font-display font-bold text-[20px]">{etape} : réservé aux abonnés</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        Il n'y a pas de formule gratuite. Les étapes Projet, Niveaux & métré et Prix restent accessibles ; le DQE et l'export PDF demandent un abonnement actif.
      </p>

      <ul className="mt-5 text-left space-y-2 text-[13px]">
        {AVANTAGES.map((a) => (
          <li key={a} className="flex gap-2"><Check size={15} className="shrink-0 mt-0.5 text-jade" />{a}</li>
        ))}
      </ul>

      {prix && (
        <p className="mt-5 font-display text-[22px] font-bold">
          {fmtXof(prix.montant)} <span className="text-[13px] font-normal text-muted">/ {prix.dureeJours} jours</span>
        </p>
      )}

      {verification && (
        <p role="status" className="mt-4 text-[13px] text-muted inline-flex items-center gap-2"><Loader size={14} className="animate-spin" /> Confirmation de votre paiement…</p>
      )}
      {erreur && <p role="alert" className="mt-4 text-[12.5px] text-laterite-deep">{erreur}</p>}

      <div className="mt-5 flex flex-col gap-2.5">
        {chargement && !verification ? (
          <p className="text-[13px] text-muted inline-flex items-center justify-center gap-2"><Loader size={14} className="animate-spin" /> Vérification de votre accès…</p>
        ) : indisponible ? (
          <Button variant="outline" size="lg" onClick={rafraichir}><RefreshCw size={15} /> Réessayer</Button>
        ) : (
          <>
            <Button variant="accent" size="lg" onClick={payer} disabled={!peutPayer || paiementEnCours || verification}>
              {paiementEnCours ? <><Loader size={15} className="animate-spin" /> Redirection vers le paiement…</> : "S'abonner"}
            </Button>
            {!peutPayer && <p className="text-[12px] text-muted">Le paiement n'est pas encore disponible.</p>}
            <p className="text-[11.5px] text-muted">Paiement sécurisé par FedaPay (Mobile Money ou carte). Vous avez déjà payé ? <button type="button" className="underline" onClick={rafraichir}>Actualiser mon accès</button></p>
          </>
        )}
        <Button variant="ghost" onClick={onRetour}>Retour aux étapes accessibles</Button>
      </div>
    </Card>
  )
}
