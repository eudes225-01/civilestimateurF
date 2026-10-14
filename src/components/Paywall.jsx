// src/components/Paywall.jsx
// Écran affiché à la place de l'export PDF tant que le compte n'est pas Premium (ou admin).
// Le bouton ouvre le récapitulatif de l'abonnement (prix, durée, fonctionnalités) avant tout paiement.
import React from 'react'
import { Lock, Check, Loader, RefreshCw, Crown } from 'lucide-react'
import { Card, Button } from './ui/index.jsx'
import { EtiquettePremium } from './StatutBadge.jsx'

const fmtXof = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`

const AVANTAGES = [
  'Export PDF professionnel à votre marque (logo, couleurs, mentions légales)',
  'Page de garde, sous-détail des prix (BPU) et récapitulatif des métrés',
  'Dépôt et lecture automatique de vos plans',
]

export default function Paywall({ etape, abo, onPremium, onRetour }) {
  const { etat, chargement, verification, rafraichir } = abo
  const prix = etat?.abonnement
  const indisponible = !chargement && !etat // état illisible : on reste verrouillé

  return (
    <Card className="max-w-[560px] mx-auto p-7 text-center" accent="laterite">
      <div className="mx-auto w-12 h-12 rounded-full bg-soleil-soft grid place-items-center text-soleil-deep">
        <Lock size={22} />
      </div>
      <h2 className="mt-4 font-display font-bold text-[20px] inline-flex items-center gap-2 flex-wrap justify-center">{etape} <EtiquettePremium /></h2>
      <p className="mt-1.5 text-[13px] text-muted">
        L'export PDF et le dépôt de plans sont réservés aux comptes Premium. Tout le reste — projet, niveaux &amp; métré, prix et DQE — reste gratuit.
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

      <div className="mt-5 flex flex-col gap-2.5">
        {chargement && !verification ? (
          <p className="text-[13px] text-muted inline-flex items-center justify-center gap-2"><Loader size={14} className="animate-spin" /> Vérification de votre accès…</p>
        ) : indisponible ? (
          <>
            {abo.erreur && <p role="alert" className="text-[12.5px] text-laterite-deep">{abo.erreur}</p>}
            <Button variant="outline" size="lg" onClick={rafraichir}><RefreshCw size={15} /> Réessayer</Button>
          </>
        ) : (
          <>
            <Button variant="accent" size="lg" onClick={onPremium} disabled={verification}>
              <Crown size={15} /> Passer Premium
            </Button>
            <p className="text-[11.5px] text-muted">Paiement sécurisé par FedaPay (Mobile Money ou carte). Vous avez déjà payé ? <button type="button" className="underline" onClick={rafraichir}>Actualiser mon accès</button></p>
          </>
        )}
        <Button variant="ghost" onClick={onRetour}>Retour aux étapes gratuites</Button>
      </div>
    </Card>
  )
}
