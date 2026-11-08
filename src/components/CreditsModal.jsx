// src/components/CreditsModal.jsx
// Fenêtre « Crédits CST » : solde, tarif de la lecture, choix du forfait (2 500 / 5 000 / 10 000 / 20 000 FCFA),
// acceptation des conditions, puis paiement FedaPay. S'affiche aussi au retour de FedaPay :
// crédits ajoutés ou paiement non abouti.
import React, { useState } from 'react'
import { Coins, Check, X, Loader, CreditCard, ShieldCheck, CircleCheck, TriangleAlert, ScanLine } from 'lucide-react'
import { Button } from './ui/index.jsx'
import Conditions from './Conditions.jsx'
import { POLITIQUES_VERSION } from '../data/politiques.js'
import { cstManquants, fmtCst, fmtXof, forfaitsDe, minimumLecture } from '../lib/acces.js'

const GRATUIT = ['Projet & plan : saisie des informations', 'Niveaux & métré (saisie manuelle)', 'Prix modifiables', 'DQE complet', 'Export PDF professionnel', 'Enregistrement de vos projets']

function Ligne({ Ic, titre, valeur }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] py-2 border-b border-line last:border-0">
      <Ic size={15} className="shrink-0 text-muted" />
      <span className="text-muted">{titre}</span>
      <span className="ml-auto font-semibold text-right">{valeur}</span>
    </div>
  )
}

export default function CreditsModal({ ouvert, onFermer, credits }) {
  const [conditions, setConditions] = useState(false)
  const [accepte, setAccepte] = useState(false) // case « J'accepte les conditions » : exigée avant le paiement
  const [choix, setChoix] = useState(null)      // montant (FCFA) du forfait sélectionné
  if (!ouvert) return null
  const { etat, statut, solde, erreur, paiementEnCours, verification, payer, retour, fermerRetour } = credits
  const fermer = () => { fermerRetour(); onFermer() }

  const admin = statut === 'admin'
  const forfaits = forfaitsDe(etat)
  const forfait = forfaits.find((f) => f.montant === choix) || null
  const min = minimumLecture(etat)
  const manque = cstManquants(etat)
  const peutPayer = !!etat?.paiementDisponible && !admin
  const tarif = etat?.tarif

  let corps
  if (retour?.ok) {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-jade-soft grid place-items-center text-jade-deep"><CircleCheck size={30} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Paiement confirmé</h2>
          <p className="mt-1 text-[13px] text-muted">Merci ! Vos crédits CST ont été ajoutés à votre solde.</p>
          <p className="mt-3 text-[12.5px] text-muted">Un e-mail de confirmation vous est envoyé, avec les conditions d'utilisation complètes en PDF.</p>
        </div>
        <div className="mt-4 rounded-xl2 border border-line px-3.5">
          {retour.credits != null && <Ligne Ic={Coins} titre="Crédits ajoutés" valeur={fmtCst(retour.credits)} />}
          {(retour.solde ?? solde) != null && <Ligne Ic={CreditCard} titre="Votre solde" valeur={fmtCst(retour.solde ?? solde)} />}
        </div>
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
              ? 'Le paiement est encore en cours de traitement. Si vous avez déjà payé, patientez un instant puis actualisez votre solde.'
              : `Le paiement n'a pas été validé (${retour.statut}). Aucun montant n'a été débité d'après FedaPay ; vous pouvez réessayer.`}
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="accent" size="lg" onClick={() => { fermerRetour() }}>Choisir un forfait et réessayer</Button>
          <Button variant="ghost" onClick={() => credits.rafraichir().then(fermer)}>Actualiser mon solde</Button>
        </div>
      </>
    )
  } else if (admin) {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-soft grid place-items-center text-indigo"><ShieldCheck size={28} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Compte administrateur</h2>
          <p className="mt-1 text-[13px] text-muted">Vous lisez des plans sans crédits CST : rien n'est débité.</p>
        </div>
        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={fermer}>Fermer</Button>
      </>
    )
  } else {
    corps = (
      <>
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-soleil-soft grid place-items-center text-soleil-deep"><Coins size={28} /></div>
          <h2 className="mt-3 font-display font-bold text-[20px]">Crédits CST</h2>
          <p className="mt-1 font-display text-[24px] font-bold">{fmtCst(solde)} <span className="text-[13px] font-normal text-muted">de solde</span></p>
          {manque > 0 && <p className="mt-1 text-[12.5px] text-laterite-deep">Il vous manque au moins {fmtCst(manque)} pour démarrer une lecture de plans.</p>}
        </div>

        <div className="mt-4 rounded-xl2 border border-line px-3.5">
          <Ligne Ic={ScanLine} titre="Solde minimum pour une lecture" valeur={fmtCst(min)} />
          <Ligne Ic={Coins} titre="Coût d'une lecture" valeur="selon les tokens traités" />
          {tarif && <Ligne Ic={CreditCard} titre="Tarif au token" valeur={`${fmtCst(tarif.entreeMillion)} / M lus · ${fmtCst(tarif.sortieMillion)} / M produits`} />}
          <Ligne Ic={ShieldCheck} titre="Paiement" valeur="FedaPay · Mobile Money ou carte" />
        </div>
        <p className="mt-2 text-[11.5px] text-muted">1 FCFA = 1 CST. Seul le coût réellement consommé est débité ; vos crédits n'expirent pas.</p>

        <p className="mt-4 text-[12.5px] font-semibold">Choisissez un forfait</p>
        <div role="radiogroup" aria-label="Forfaits de crédits" className="mt-2 grid grid-cols-2 gap-2">
          {forfaits.map((f) => {
            const on = f.montant === choix
            return (
              <button key={f.montant} type="button" role="radio" aria-checked={on} onClick={() => setChoix(f.montant)}
                className={`text-left rounded-xl2 border-2 px-3 py-2.5 transition-colors ${on ? 'border-indigo bg-indigo-soft/40' : 'border-line hover:border-indigo/60'}`}>
                <span className="block font-display font-bold text-[16px]">{fmtXof(f.montant)}</span>
                <span className="block text-[12px] text-muted">{fmtCst(f.credits)}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-[12.5px] font-semibold">Les crédits servent à</p>
        <ul className="mt-2 space-y-2 text-[13px]">
          {(etat?.usagesCredits?.length ? etat.usagesCredits : [{ cle: 'lecture_plans', libelle: 'Lecture automatique des plans, facturée selon le nombre de tokens traités' }]).map((u) => (
            <li key={u.cle} className="flex gap-2"><Coins size={14} className="shrink-0 mt-0.5 text-soleil-deep" />{u.libelle}</li>
          ))}
        </ul>

        <p className="mt-4 text-[12.5px] font-semibold">Toujours gratuit</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] text-muted">
          {GRATUIT.map((g) => <li key={g} className="flex gap-2"><Check size={14} className="shrink-0 mt-0.5 text-jade" />{g}</li>)}
        </ul>

        <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-snug cursor-pointer">
          <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5 shrink-0 w-4 h-4 accent-indigo" />
          <span>
            J'ai lu et j'accepte les{' '}
            <button type="button" className="underline text-indigo font-semibold" onClick={(e) => { e.preventDefault(); setConditions(true) }}>conditions d'utilisation</button>{' '}
            (version {POLITIQUES_VERSION}). Paiement unique, sans abonnement ; les crédits achetés à partir du 1er décembre 2026 expirent un mois après le dernier achat soumis à expiration, et les crédits antérieurs restent protégés même après une recharge (rappel par e-mail avant l'échéance) ; les crédits achetés ne sont pas remboursables, sauf paiement débité sans ajout de crédits ou double paiement.
          </span>
        </label>
        {verification && <p role="status" className="mt-4 text-[13px] text-muted inline-flex items-center gap-2"><Loader size={14} className="animate-spin" /> Confirmation de votre paiement…</p>}
        {erreur && <p role="alert" className="mt-4 text-[12.5px] text-laterite-deep">{erreur}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <Button variant="accent" size="lg" onClick={() => payer(choix, accepte)} disabled={!peutPayer || !forfait || paiementEnCours || verification || !accepte}>
            {paiementEnCours
              ? <><Loader size={15} className="animate-spin" /> Redirection vers le paiement…</>
              : <><Coins size={15} /> {forfait ? `Payer ${fmtXof(forfait.montant)} · obtenir ${fmtCst(forfait.credits)}` : 'Choisissez un forfait'}</>}
          </Button>
          {!peutPayer && !paiementEnCours && <p className="text-center text-[12px] text-muted">Le paiement n'est pas encore disponible.</p>}
          {peutPayer && forfait && !accepte && !paiementEnCours && <p className="text-center text-[12px] text-muted">Cochez la case ci-dessus pour activer le paiement.</p>}
          <Button variant="ghost" onClick={fermer}>Annuler</Button>
          <p className="text-center text-[11.5px] text-muted">Vous avez déjà payé ? <button type="button" className="underline" onClick={() => credits.rafraichir()}>Actualiser mon solde</button></p>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6 overflow-auto" onClick={fermer}>
      <div role="dialog" aria-modal="true" aria-label="Crédits CST"
        className="relative w-full max-w-[480px] max-h-full overflow-auto rounded-xl2 bg-card border border-line shadow-card p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={fermer} className="absolute top-3 right-3 p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={17} /></button>
        {corps}
      </div>
      <Conditions ouvert={conditions} onFermer={() => setConditions(false)} />
    </div>
  )
}
