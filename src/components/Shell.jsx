// src/components/Shell.jsx
// Bandeau promo, chrono, onboarding (avec acceptation des politiques), footer.
import React, { useState, useEffect } from 'react'
import {
  HardHat, User, ArrowRight, Sparkles, Shield, Timer,
  Calculator, FileCheck2, MapPinned, Check, ChevronDown,
} from 'lucide-react'
import { Badge } from './ui/index.jsx'
import { LogoMark } from './Logo.jsx'
import { accessState, FIN_GRATUIT, fmtDate } from '../lib/format.js'

const { gratuit, joursRestants } = accessState()

/* ─── Hook chrono : temps restant jusqu'à une date ──────────────────────────── */
function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, new Date(target) - new Date())
    return {
      d: Math.floor(diff / 86_400_000),
      h: Math.floor((diff / 3_600_000) % 24),
      m: Math.floor((diff / 60_000) % 60),
      s: Math.floor((diff / 1000) % 60),
      fini: diff === 0,
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [target])
  return t
}

/* ─── Chrono d'accès gratuit (décompte live) ────────────────────────────────── */
export function Countdown({ light = false }) {
  const { d, h, m, s } = useCountdown(FIN_GRATUIT)
  const cells = [
    { v: d, lab: 'Jours' },
    { v: h, lab: 'Heures' },
    { v: m, lab: 'Min' },
    { v: s, lab: 'Sec' },
  ]
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className={`chip ${light ? 'bg-white/15 text-white' : 'bg-laterite-soft text-laterite-deep'}`}>
        <Timer size={13} /> Accès 100 % gratuit — fin le {fmtDate(FIN_GRATUIT)}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {cells.map((c, i) => (
          <React.Fragment key={c.lab}>
            <div
              className={`min-w-[58px] sm:min-w-[68px] rounded-xl2 px-2.5 py-2 text-center border backdrop-blur ${
                light
                  ? 'bg-white/12 border-white/25 text-white'
                  : 'bg-card border-line shadow-soft text-ink'
              }`}
            >
              <div
                key={c.lab === 'Sec' ? c.v : undefined}
                className={`font-mono font-bold tabular-nums leading-none text-[24px] sm:text-[30px] ${
                  c.lab === 'Sec' ? 'animate-pop text-soleil' : ''
                }`}
              >
                {String(c.v).padStart(2, '0')}
              </div>
              <div className={`mt-1 text-[10px] uppercase tracking-widest ${light ? 'text-white/70' : 'text-muted'}`}>
                {c.lab}
              </div>
            </div>
            {i < cells.length - 1 && (
              <span className={`font-mono font-bold text-[20px] ${light ? 'text-white/50' : 'text-line-strong'}`}>:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

/* ─── Bandeau promo défilant ────────────────────────────────────────────────── */
export function PromoBanner() {
  if (!gratuit) return null
  return (
    <div className="relative overflow-hidden gradient-hero animate-drift text-white text-[13px]">
      <div className="absolute inset-0 blueprint-grid opacity-30 animate-grid-pan pointer-events-none" />
      {/* reflet animé */}
      <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/15 blur-xl skew-x-12 animate-shimmer pointer-events-none" />
      <div className="relative max-w-[1180px] mx-auto px-[18px] py-2 flex flex-wrap gap-2.5 items-center justify-center text-center font-medium">
        <Sparkles size={14} className="shrink-0" />
        <span>
          <strong className="font-display">Toutes les fonctionnalités gratuites</strong> jusqu'au {fmtDate(FIN_GRATUIT)}
        </span>
        <span className="font-mono bg-white/20 px-2.5 py-0.5 rounded-full font-bold">J‑{joursRestants}</span>
      </div>
    </div>
  )
}

/* ─── Onboarding ────────────────────────────────────────────────────────────── */
const ATOUTS = [
  { Ic: Calculator, t: 'Métré automatique', c: 'Quantités, dosages et totaux calculés à partir de vos dimensions.', col: 'indigo' },
  { Ic: FileCheck2, t: 'DQE & export PDF', c: 'Devis quantitatif estimatif prêt à soumettre, en francs CFA.', col: 'laterite' },
  { Ic: MapPinned, t: 'Fondation par ville', c: 'Recommandations géotechniques selon votre localité au Bénin.', col: 'jade' },
]

const POLITIQUES = [
  'Les quantités, prix et recommandations sont indicatifs (Guide du métré + RPR 26.2) et ne remplacent ni le CCTP, ni une étude géotechnique.',
  'Les calculs sont déterministes : formules publiques et coefficients que vous gardez la main d’ajuster. Aucune décision automatique à votre place.',
  'Les plans déposés sont utilisés uniquement pour produire votre métré ; vos saisies restent liées à votre devis et ne sont pas revendues.',
  'Les résultats doivent être validés par un professionnel avant tout engagement contractuel (marchés publics DNCMP/ARMP, fiscalité DGI).',
  'Les documents générés (DQE, PDF) vous appartiennent. L’extraction massive ou la revente de la base de prix RPR est interdite.',
  'Accès gratuit et sans inscription pendant toute la période d’ouverture indiquée par le compte à rebours.',
]

export function Onboarding({ onStart }) {
  const [accepted, setAccepted] = useState(false)
  const [openPol, setOpenPol] = useState(false)

  const choose = (profile) => {
    if (!accepted) {
      setOpenPol(true)
      document.getElementById('accept-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onStart(profile)
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
            les prix à votre réalité de terrain. Sans compte, sans paiement.
          </p>

          <div className="mt-8 flex justify-center animate-fade-up [animation-delay:240ms]">
            <Countdown light />
          </div>
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

      {/* ── CHOIX DU PROFIL ── */}
      <div className="max-w-[1180px] mx-auto px-[18px] py-10">
        <div className="text-center mb-6 animate-fade-up">
          <h2 className="text-[22px] sm:text-[26px] font-display font-bold">Comment utilisez-vous l'outil ?</h2>
          <p className="text-muted text-[14px] mt-1.5">Votre profil adapte l'interface — notamment l'édition des prix.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-[880px] mx-auto">
          {/* Professionnel */}
          <button
            onClick={() => choose('pro')}
            className={`group relative text-left border-2 rounded-xl3 p-[24px] shadow-card transition-all duration-300 overflow-hidden animate-fade-up [animation-delay:80ms]
              ${accepted ? 'bg-card border-indigo/15 hover:-translate-y-1.5 hover:border-indigo hover:shadow-glow' : 'bg-card border-line opacity-60'}`}
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo to-lagune" />
            <div className="w-[46px] h-[46px] rounded-[13px] grid place-items-center mb-3.5 bg-indigo text-white shadow-glow">
              <HardHat size={24} />
            </div>
            <Badge variant="ind" className="mb-2">Édition des prix activée</Badge>
            <h3 className="text-[18px] font-display font-bold">Professionnel du génie civil</h3>
            <p className="text-muted text-[13.5px] mt-1.5 leading-relaxed">
              Métreur, conducteur de travaux, BET, entreprise BTP. Grille de prix type tableur :
              vous <b className="text-ink">modifiez chaque prix unitaire</b>, sous-détails, multi-niveaux, export DQE.
            </p>
            <span className="mt-4 font-semibold text-[13.5px] text-indigo inline-flex gap-1.5 items-center group-hover:gap-2.5 transition-all">
              Ouvrir l'atelier complet <ArrowRight size={15} />
            </span>
          </button>

          {/* Particulier */}
          <button
            onClick={() => choose('particulier')}
            className={`group relative text-left border-2 rounded-xl3 p-[24px] shadow-card transition-all duration-300 overflow-hidden animate-fade-up [animation-delay:160ms]
              ${accepted ? 'bg-card border-laterite/15 hover:-translate-y-1.5 hover:border-laterite hover:shadow-glow-lat' : 'bg-card border-line opacity-60'}`}
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-laterite to-soleil" />
            <div className="w-[46px] h-[46px] rounded-[13px] grid place-items-center mb-3.5 bg-gradient-to-br from-laterite to-soleil text-white shadow-glow-lat">
              <User size={24} />
            </div>
            <Badge variant="lat" className="mb-2">Prix en lecture seule</Badge>
            <h3 className="text-[18px] font-display font-bold">Particulier</h3>
            <p className="text-muted text-[13.5px] mt-1.5 leading-relaxed">
              Vous faites construire votre maison. Estimation guidée, vue simplifiée, fondation
              conseillée selon votre ville. Les prix de référence sont <b className="text-ink">affichés mais non modifiables</b>.
            </p>
            <span className="mt-4 font-semibold text-[13.5px] text-laterite inline-flex gap-1.5 items-center group-hover:gap-2.5 transition-all">
              Estimer ma maison <ArrowRight size={15} />
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
export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-card/60">
      <div className="max-w-[1180px] mx-auto px-[18px] py-6 flex flex-wrap gap-3.5 justify-between items-center text-[12.5px] text-muted">
        <span className="flex items-center gap-2">
          <LogoMark size={18} />
          CivilEstimator · Métré &amp; DQE — Bénin · données RPR 26.2 (mars 2026)
        </span>
        <Badge variant="ind"><Shield size={13} /> FCFA · TVA 18 % · UEMOA</Badge>
      </div>
    </footer>
  )
}
