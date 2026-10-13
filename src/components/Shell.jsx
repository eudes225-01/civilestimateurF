// src/components/Shell.jsx
// Onboarding (avec acceptation des politiques), footer.
import React, { useState } from 'react'
import {
  ArrowRight, Shield,
  Calculator, FileCheck2, ScanLine, Check, ChevronDown,
} from 'lucide-react'
import { Badge } from './ui/index.jsx'
import { LogoMark } from './Logo.jsx'
import { PRIX_VERSION, PRIX_DATE } from '../lib/metre.js'
import { fmtMois } from '../lib/format.js'

// Lien « ArchiNova » du pied de page → site portfolio de l'équipe (VITE_PORTFOLIO_URL).
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || ''

/* ─── Onboarding ────────────────────────────────────────────────────────────── */
const ATOUTS = [
  { Ic: Calculator, t: 'Métré automatique', c: 'Quantités, dosages et totaux calculés à partir de vos dimensions.', col: 'indigo' },
  { Ic: FileCheck2, t: 'DQE & export PDF', c: 'Devis quantitatif estimatif prêt à soumettre, en francs CFA.', col: 'laterite' },
  { Ic: ScanLine, t: 'Plans par type', c: 'Fondation, étages, coupe, plomberie, électricité, poutraison, toiture, coffrage : chaque plan est lu et calculé à part.', col: 'jade' },
]

const POLITIQUES = [
  'Les quantités et prix sont indicatifs (Guide du métré + barème de prix RPR) et ne remplacent ni le CCTP, ni une étude géotechnique.',
  'Les calculs sont déterministes : formules publiques et coefficients que vous gardez la main d’ajuster. Aucune décision automatique à votre place.',
  'Les plans déposés sont utilisés uniquement pour produire votre métré ; vos saisies restent liées à votre devis et ne sont pas revendues.',
  'Les résultats doivent être validés par un professionnel avant tout engagement contractuel (marchés publics DNCMP/ARMP, fiscalité DGI).',
  'Les documents générés (DQE, PDF) vous appartiennent. L’extraction massive ou la revente de la base de prix RPR est interdite.',
  'Compte Google : votre nom et votre e-mail servent uniquement à créer votre compte et à retrouver vos projets enregistrés ; ils ne sont ni revendus ni partagés. Les fichiers de plans ne sont pas conservés sur nos serveurs.',
]

export function Onboarding({ onStart }) {
  const [accepted, setAccepted] = useState(false)
  const [openPol, setOpenPol] = useState(false)

  const demarrer = () => {
    if (!accepted) {
      setOpenPol(true)
      document.getElementById('accept-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onStart()
  }

  return (
    <div className="flex-1">
      {/* ── BANNIÈRE HÉRO ── */}
      <section className="relative overflow-hidden gradient-hero animate-drift text-white">
        <div className="absolute inset-0 blueprint-grid opacity-40 animate-grid-pan pointer-events-none" />
        {/* modules de chantier flottants */}
        <div className="absolute top-10 right-[8%] w-24 h-24 rounded-2xl border-2 border-white/20 rotate-12 animate-float pointer-events-none" />
        <div className="absolute bottom-12 right-[22%] w-14 h-14 rounded-xl bg-soleil/25 animate-float-slow pointer-events-none" />
        <div className="absolute top-1/2 left-[6%] w-16 h-16 rounded-full border-2 border-white/15 animate-float-slow pointer-events-none" />
        <div className="absolute bottom-8 left-[20%] w-10 h-10 rounded-lg bg-white/10 rotate-45 animate-float pointer-events-none" />

        <div className="relative max-w-[1180px] mx-auto px-[18px] py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-4 animate-fade-up">
            <LogoMark size={62} glow />
          </div>
          <div className="eyebrow text-white/80 animate-fade-up">Métré &amp; DQE · République du Bénin · UEMOA</div>
          <h1 className="mt-3 text-[clamp(30px,5.4vw,54px)] leading-[1.05] font-display font-bold animate-fade-up [animation-delay:80ms]">
            Du relevé sur plan<br />
            <span className="text-soleil">au devis estimatif</span>, en francs CFA.
          </h1>
          <p className="max-w-[600px] mx-auto mt-4 text-[15px] sm:text-[16px] text-white/85 animate-fade-up [animation-delay:160ms]">
            Saisissez vos dimensions : le calcul automatique sort les quantités, vous ajustez
            les prix à votre réalité de terrain. Connexion avec Google ; le DQE et l'export PDF sont réservés aux abonnés.
          </p>
        </div>

        {/* vague de séparation */}
        <svg className="relative block w-full h-[40px] text-paper" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0,32 C240,48 480,8 720,16 C960,24 1200,48 1440,28 L1440,48 L0,48 Z" />
        </svg>
      </section>

      {/* ── ATOUTS ── */}
      <div className="max-w-[1180px] mx-auto px-[18px] -mt-4">
        <div className="grid sm:grid-cols-3 gap-3.5">
          {ATOUTS.map(({ Ic, t, c, col }, i) => (
            <div
              key={t}
              className="bg-card border border-line rounded-xl2 shadow-card p-4 flex gap-3 items-start animate-fade-up"
              style={{ animationDelay: `${300 + i * 90}ms` }}
            >
              <div className={`shrink-0 w-10 h-10 rounded-[11px] grid place-items-center text-white bg-${col}`}>
                <Ic size={19} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-[14.5px]">{t}</h3>
                <p className="text-muted text-[12.5px] mt-0.5 leading-snug">{c}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ENTRÉE UNIQUE ── */}
      <div className="max-w-[1180px] mx-auto px-[18px] py-10">
        <div className="text-center mb-6 animate-fade-up">
          <h2 className="text-[22px] sm:text-[26px] font-display font-bold">Prêt à estimer votre projet ?</h2>
          <p className="text-muted text-[14px] mt-1.5">Une seule expérience, complète : plans par type, métré, prix modifiables, sous-détails, multi-niveaux et export DQE.</p>
        </div>

        <div className="max-w-[560px] mx-auto">
          <button
            onClick={demarrer}
            className={`group relative w-full text-left border-2 rounded-xl3 p-[24px] shadow-card transition-all duration-300 overflow-hidden animate-fade-up [animation-delay:80ms]
              ${accepted ? 'bg-card border-indigo/15 hover:-translate-y-1.5 hover:border-indigo hover:shadow-glow' : 'bg-card border-line opacity-60'}`}
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo to-lagune" />
            <div className="w-[46px] h-[46px] rounded-[13px] grid place-items-center mb-3.5 bg-indigo text-white shadow-glow">
              <Calculator size={24} />
            </div>
            <Badge variant="ind" className="mb-2">Toutes les fonctions activées</Badge>
            <h3 className="text-[18px] font-display font-bold">Commencer l'estimation</h3>
            <p className="text-muted text-[13.5px] mt-1.5 leading-relaxed">
              Déposez vos plans (fondation, étages, coupe, plomberie, électricité, poutraison, toiture, coffrage) ou saisissez vos dimensions :
              chaque type de plan est lu et calculé avec le module qui lui correspond. Vous <b className="text-ink">modifiez chaque prix unitaire</b> et exportez le DQE.
            </p>
            <span className="mt-4 font-semibold text-[13.5px] text-indigo inline-flex gap-1.5 items-center group-hover:gap-2.5 transition-all">
              Ouvrir l'atelier <ArrowRight size={15} />
            </span>
          </button>
        </div>

        {/* ── ACCEPTATION DES POLITIQUES (juste en dessous) ── */}
        <div id="accept-box" className="max-w-[880px] mx-auto mt-5 animate-fade-up [animation-delay:240ms]">
          <div className={`rounded-xl2 border-2 transition-colors ${accepted ? 'border-jade/40 bg-jade-soft' : openPol ? 'border-laterite/50 bg-laterite-soft' : 'border-dashed border-line-strong bg-card'}`}>
            <label className="flex items-start gap-3 p-4 cursor-pointer">
              <span
                className={`mt-0.5 shrink-0 w-[22px] h-[22px] rounded-[7px] grid place-items-center border-2 transition-all
                  ${accepted ? 'bg-jade border-jade text-white animate-pulse-ring' : 'bg-card border-line-strong'}`}
              >
                {accepted && <Check size={14} strokeWidth={3} />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span className="text-[13.5px] leading-relaxed">
                <b className="text-ink">J'ai lu et j'approuve</b> les politiques d'utilisation.
                {!accepted && <span className="text-laterite-deep font-medium"> (obligatoire pour continuer)</span>}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenPol((o) => !o) }}
                  className="ml-1 inline-flex items-center gap-1 text-indigo font-semibold underline-offset-2 hover:underline"
                >
                  Lire le résumé <ChevronDown size={13} className={`transition-transform ${openPol ? 'rotate-180' : ''}`} />
                </button>
              </span>
            </label>

            {openPol && (
              <ul className="px-4 pb-4 pt-0 grid gap-2 animate-fade-in">
                {POLITIQUES.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] text-muted leading-snug">
                    <Shield size={14} className="shrink-0 mt-0.5 text-indigo" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────────── */
export function Footer({ prix }) {
  const version = prix?.version || PRIX_VERSION
  const date = prix?.date || PRIX_DATE
  return (
    <footer className="mt-auto border-t border-line bg-card/60">
      <div className="max-w-[1180px] mx-auto px-[18px] py-6 flex flex-wrap gap-3.5 justify-between items-center text-[12.5px] text-muted">
        <span className="flex items-center gap-2">
          <LogoMark size={18} />
          CivilEstimator · Métré &amp; DQE — Bénin · données {version} ({fmtMois(date)})
        </span>
        <Badge variant="ind"><Shield size={13} /> FCFA · TVA 18 % · UEMOA</Badge>
      </div>
      <div className="border-t border-line/60 px-[18px] py-3 text-center text-[12px] text-muted">
        © {new Date().getFullYear()}{' '}
        {PORTFOLIO_URL ? (
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-ink hover:text-indigo underline-offset-2 hover:underline">ArchiNova</a>
        ) : (
          <span className="font-semibold text-ink">ArchiNova</span>
        )}{' '}
        — Tous droits réservés
      </div>
    </footer>
  )
}
