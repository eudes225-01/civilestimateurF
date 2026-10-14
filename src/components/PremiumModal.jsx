// src/components/PremiumModal.jsx
// Fenêtre « Passer Premium » : récapitulatif complet AVANT le paiement (prix, durée, dates, fonctionnalités
// débloquées), puis confirmation du paiement FedaPay. S'affiche aussi au retour de FedaPay :
// paiement confirmé (nouveau statut Premium) ou non abouti.
import React, { useState } from 'react'
import { Crown, Check, X, Loader, CalendarDays, Clock, CreditCard, ShieldCheck, CircleCheck, TriangleAlert } from 'lucide-react'
import { Button } from './ui/index.jsx'
import StatutBadge from './StatutBadge.jsx'
import Conditions from './Conditions.jsx'
import { POLITIQUES_VERSION } from '../data/politiques.js'

const fmtXof = (n) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`
const fmtJour = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Repli si le serveur ne renvoie pas la liste (ancienne version du backend).
const FONCTIONS_DEFAUT = [
  { cle: 'depots', libelle: 'Dépôt et lecture automatique des plans (fondation, coupe, toiture, plomberie, électricité…)' },
  { cle: 'export_pdf', libelle: 'Export PDF professionnel du devis (logo, couleurs, mentions légales)' },
]
const GRATUIT = ['Projet & plan : saisie des informations', 'Niveaux & métré (saisie manuelle)', 'Prix modifiables', 'DQE complet', 'Enregistrement de vos projets']

function Ligne({ Ic, titre, valeur }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] py-2 border-b border-line last:border-0">
      <Ic size={15} className="shrink-0 text-muted" />
      <span className="text-muted">{titre}</span>
      <span className="ml-auto font-semibold text-right">{valeur}</span>
    </div>
  )
}

export default function PremiumModal({ ouvert, onFermer, abo }) {
  const [conditions, setConditions] = useState(false)
  const [accepte, setAccepte] = useState(false) // case « J'accepte les conditions » : exigée avant le paiement
  if (!ouvert) return null
  const { etat, statut, erreur, paiementEnCours, verification, payer, retour, fermerRetour } = abo
  const fermer = () => { fermerRetour(); onFermer() }

  const prix = etat?.abonnement
  const fonctions = etat?.fonctionnalitesPremium?.length ? etat.fonctionnalitesPremium : FONCTIONS_DEFAUT
  const premium = statut === 'premium'
  const admin = statut === 'admin'
  const peutPayer = !!etat?.paiementDisponible && !!prix && !admin

  // Dates du récapitulatif : début = aujourd'hui, ou la fin de l'abonnement en cours (la durée s'ajoute).
  const debut = premium && etat?.finAbonnement ? new Date(etat.finAbonnement) : new Date()
  const fin = prix ? new Date(debut.getTime() + prix.dureeJours * 86400000) : null

  let corps
  if (retour?.ok) {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-jade-soft grid place-items-center text-jade-deep"><CircleCheck size={30} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Paiement confirmé</h2>
          <p className="mt-1 text-[13px] text-muted">Merci ! Votre compte est maintenant <b className="text-ink">Premium</b>.</p>
          <div className="mt-2"><StatutBadge statut="premium" /></div>
          <p className="mt-3 text-[12.5px] text-muted">Un e-mail de confirmation vous est envoyé, avec les conditions d'utilisation complètes en PDF.</p>
        </div>
        <div className="mt-4 rounded-xl2 border border-line px-3.5">
          {prix && <Ligne Ic={Clock} titre="Durée de l'abonnement" valeur={`${prix.dureeJours} jours`} />}
          {(retour.fin || etat?.finAbonnement) && <Ligne Ic={CalendarDays} titre="Actif jusqu'au" valeur={fmtJour(retour.fin || etat.finAbonnement)} />}
          {prix && <Ligne Ic={CreditCard} titre="Montant réglé" valeur={fmtXof(prix.montant)} />}
        </div>
        <p className="mt-4 text-[12.5px] font-semibold">Fonctionnalités Premium maintenant débloquées</p>
        <ul className="mt-2 space-y-2 text-[13px]">
          {fonctions.map((f) => <li key={f.cle} className="flex gap-2"><Check size={15} className="shrink-0 mt-0.5 text-jade" />{f.libelle}</li>)}
        </ul>
        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={fermer}>Continuer</Button>
      </>
    )
  } else if (retour && !retour.ok) {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-laterite-soft grid place-items-center text-laterite-deep"><TriangleAlert size={28} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Paiement non abouti</h2>
          <p className="mt-1 text-[13px] text-muted">
            {['pending', 'inconnue'].includes(String(retour.statut).toLowerCase())
              ? 'Le paiement est encore en cours de traitement. Si vous avez déjà payé, patientez un instant puis actualisez votre accès.'
              : `Le paiement n'a pas été validé (${retour.statut}). Aucun montant n'a été débité d'après FedaPay ; vous pouvez réessayer.`}
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="accent" size="lg" onClick={() => { fermerRetour() }}>Voir le récapitulatif et réessayer</Button>
          <Button variant="ghost" onClick={() => abo.rafraichir().then(fermer)}>Actualiser mon accès</Button>
        </div>
      </>
    )
  } else if (admin) {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-soft grid place-items-center text-indigo"><ShieldCheck size={28} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Compte administrateur</h2>
          <p className="mt-1 text-[13px] text-muted">Vous avez accès à 100 % des fonctionnalités, sans abonnement ni paiement.</p>
        </div>
        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={fermer}>Fermer</Button>
      </>
    )
  } else {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-soleil-soft grid place-items-center text-soleil-deep"><Crown size={28} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">{premium ? 'Prolonger votre abonnement Premium' : 'Passer Premium'}</h2>
          {prix && (
            <p className="mt-1 font-display text-[24px] font-bold">
              {fmtXof(prix.montant)} <span className="text-[13px] font-normal text-muted">/ {prix.dureeJours} jours</span>
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl2 border border-line px-3.5">
          {prix && <Ligne Ic={Clock} titre="Durée de l'abonnement" valeur={`${prix.dureeJours} jours`} />}
          {prix && <Ligne Ic={CalendarDays} titre={premium ? 'Début (à la fin de l\'abonnement en cours)' : 'Début'} valeur={premium ? fmtJour(debut) : 'Dès la confirmation du paiement'} />}
          {fin && <Ligne Ic={CalendarDays} titre="Fin estimée" valeur={fmtJour(fin)} />}
          {prix && <Ligne Ic={CreditCard} titre="Montant à payer" valeur={fmtXof(prix.montant)} />}
          <Ligne Ic={ShieldCheck} titre="Paiement" valeur="FedaPay · Mobile Money ou carte" />
        </div>

        <p className="mt-4 text-[12.5px] font-semibold">Fonctionnalités Premium que vous débloquez</p>
        <ul className="mt-2 space-y-2 text-[13px]">
          {fonctions.map((f) => <li key={f.cle} className="flex gap-2"><Crown size={14} className="shrink-0 mt-0.5 text-soleil-deep" />{f.libelle}</li>)}
        </ul>

        <p className="mt-4 text-[12.5px] font-semibold">Toujours gratuit (statut Standard)</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] text-muted">
          {GRATUIT.map((g) => <li key={g} className="flex gap-2"><Check size={14} className="shrink-0 mt-0.5 text-jade" />{g}</li>)}
        </ul>

        <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-snug cursor-pointer">
          <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5 shrink-0 w-4 h-4 accent-indigo" />
          <span>
            J'ai lu et j'accepte les{' '}
            <button type="button" className="underline text-indigo font-semibold" onClick={(e) => { e.preventDefault(); setConditions(true) }}>conditions d'utilisation</button>{' '}
            (version {POLITIQUES_VERSION}). Paiement unique pour la période indiquée, sans renouvellement automatique ; la période activée n'est pas remboursable, sauf paiement débité sans activation ou double paiement.
          </span>
        </label>
        {premium && <p className="mt-3 text-[12px] text-muted">Vous êtes déjà Premium : la nouvelle durée s'ajoute à votre abonnement en cours, sans perte de jours.</p>}
        {verification && <p role="status" className="mt-4 text-[13px] text-muted inline-flex items-center gap-2"><Loader size={14} className="animate-spin" /> Confirmation de votre paiement…</p>}
        {erreur && <p role="alert" className="mt-4 text-[12.5px] text-laterite-deep">{erreur}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <Button variant="accent" size="lg" onClick={() => payer(accepte)} disabled={!peutPayer || paiementEnCours || verification || !accepte}>
            {paiementEnCours
              ? <><Loader size={15} className="animate-spin" /> Redirection vers le paiement…</>
              : <><Crown size={15} /> Payer{prix ? ` ${fmtXof(prix.montant)}` : ''}</>}
          </Button>
          {!peutPayer && !paiementEnCours && <p className="text-center text-[12px] text-muted">Le paiement n'est pas encore disponible.</p>}
          {peutPayer && !accepte && !paiementEnCours && <p className="text-center text-[12px] text-muted">Cochez la case ci-dessus pour activer le paiement.</p>}
          <Button variant="ghost" onClick={fermer}>Annuler</Button>
          <p className="text-center text-[11.5px] text-muted">Vous avez déjà payé ? <button type="button" className="underline" onClick={() => abo.rafraichir()}>Actualiser mon accès</button></p>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6 overflow-auto" onClick={fermer}>
      <div role="dialog" aria-modal="true" aria-label="Abonnement Premium"
        className="relative w-full max-w-[480px] max-h-full overflow-auto rounded-xl2 bg-card border border-line shadow-card p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={fermer} className="absolute top-3 right-3 p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={17} /></button>
        {corps}
      </div>
      <Conditions ouvert={conditions} onFermer={() => setConditions(false)} />
    </div>
  )
}
