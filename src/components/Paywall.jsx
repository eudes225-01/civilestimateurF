// src/components/Paywall.jsx
// Écran affiché pour les fonctions Premium (dépôt de plans et export PDF).
import React, { useState } from 'react'
import { Check, Loader, RefreshCw, Crown, CreditCard, CalendarDays } from 'lucide-react'
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
  const [detailsOuverts, setDetailsOuverts] = useState(false)
  const prix = etat?.abonnement
  const avantages = etat?.fonctionnalites?.filter((f) => f.premium).map((f) => f.libelle) || AVANTAGES.slice(2)
  const indisponible = !chargement && !etat // état illisible : on reste verrouillé
  const peutPayer = !!etat?.paiementDisponible && !indisponible

  return (
    <Card className="max-w-[560px] mx-auto p-7 text-center" accent="laterite">
      <div className="mx-auto w-12 h-12 rounded-full bg-soleil-soft grid place-items-center text-soleil-deep">
        <Crown size={22} />
      </div>
      <h2 className="mt-4 font-display font-bold text-[20px]">{etape} : accès Premium</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        Seuls le dépôt / la lecture des plans et l’export PDF sont réservés aux abonnés Premium. Le DQE, le métré et vos projets restent accessibles avec un compte standard.
      </p>

      <ul className="mt-5 text-left space-y-2 text-[13px]">
        {avantages.map((a) => (
          <li key={a} className="flex gap-2"><Check size={15} className="shrink-0 mt-0.5 text-jade" />{a}</li>
        ))}
      </ul>

      {prix && <p className="mt-5 font-display text-[22px] font-bold">{fmtXof(prix.montant)} <span className="text-[13px] font-normal text-muted">/ {prix.dureeJours} jours</span></p>}

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
            {!detailsOuverts ? (
              <Button variant="accent" size="lg" onClick={() => setDetailsOuverts(true)} disabled={!peutPayer || verification}><Crown size={15} /> Voir les détails et payer</Button>
            ) : (
              <div className="rounded-xl2 border border-soleil/35 bg-soleil-soft/40 p-4 text-left">
                <p className="font-semibold text-[14px]">Votre abonnement Premium</p>
                <p className="mt-2 text-[13px] flex items-center gap-2"><CalendarDays size={14} className="text-soleil-deep" /> Durée : <b>{prix?.dureeJours || '—'} jours</b></p>
                <p className="mt-1 text-[13px] flex items-center gap-2"><CreditCard size={14} className="text-soleil-deep" /> Montant : <b>{prix ? fmtXof(prix.montant) : '—'}</b></p>
                <p className="mt-2 text-[12px] text-muted">Après confirmation du paiement, votre statut passe de <b>Standard</b> à <b>Premium</b>. Le paiement est unique, sans reconduction automatique.</p>
                <Button variant="accent" size="lg" className="mt-3 w-full" onClick={payer} disabled={paiementEnCours || verification}>
                  {paiementEnCours ? <><Loader size={15} className="animate-spin" /> Redirection vers le paiement…</> : <><CreditCard size={15} /> Payer et activer Premium</>}
                </Button>
              </div>
            )}
            {!peutPayer && <p className="text-[12px] text-muted">Le paiement n'est pas encore disponible.</p>}
            <p className="text-[11.5px] text-muted">Paiement sécurisé par FedaPay (Mobile Money ou carte). Vous avez déjà payé ? <button type="button" className="underline" onClick={rafraichir}>Actualiser mon accès</button></p>
          </>
        )}
        <Button variant="ghost" onClick={onRetour}>Retour aux étapes accessibles</Button>
      </div>
    </Card>
  )
}
