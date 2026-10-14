// src/components/Shell.jsx
// Onboarding (avec acceptation des politiques), footer.
import React, { useState } from 'react'
import {
  ArrowRight, Shield,
  Calculator, FileCheck2, ScanLine, Check, ChevronDown,
} from 'lucide-react'
import { Badge } from './ui/index.jsx'
import { LogoMark } from './Logo.jsx'
import HeroDecor from './HeroDecor.jsx'
import { PRIX_VERSION, PRIX_DATE } from '../lib/metre.js'
import { fmtMois } from '../lib/format.js'
import Conditions from './Conditions.jsx'
import { POLITIQUES_RESUME, POLITIQUES_VERSION } from '../data/politiques.js'
import { api } from '../lib/api.js'

// Lien « ArchiNova » du pied de page → site portfolio de l'équipe (VITE_PORTFOLIO_URL).
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || ''

/* ─── Onboarding ────────────────────────────────────────────────────────────── */
const ATOUTS = [
  { Ic: Calculator, t: 'Métré automatique', c: 'Quantités, dosages et totaux calculés à partir de vos dimensions.', col: 'indigo' },
  { Ic: FileCheck2, t: 'DQE gratuit & export PDF', c: 'Devis quantitatif estimatif en francs CFA ; export PDF professionnel avec Premium.', col: 'laterite' },
  { Ic: ScanLine, t: 'Plans par type', c: 'Fondation, étages, coupe, plomberie, électricité, poutraison, toiture, coffrage : chaque plan est lu et calculé à part.', col: 'jade' },
]

export function Onboarding({ onStart }) {
  const [accepted, setAccepted] = useState(false)
  const [openPol, setOpenPol] = useState(false)
  const [conditions, setConditions] = useState(false)

  const demarrer = () => {
    if (!accepted) {
      setOpenPol(true)
      document.getElementById('accept-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // Preuve d'acceptation (Supabase) : en arrière-plan, jamais bloquante pour l'utilisateur.
    api.accepterConditions(POLITIQUES_VERSION).catch((e) => console.warn('[conditions] preuve non enregistrée :', e?.error || e?.message))
    onStart()
  }

  return (
    <div className="flex-1">
      {/* ── BANNIÈRE HÉRO ── */}
      <section className="relative overflow-hidden gradient-hero animate-drift text-white">
        <HeroDecor />

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
            les prix à votre réalité de terrain. Connexion avec Google ; le DQE est gratuit, le dépôt de plans et l'export PDF sont réservés aux comptes Premium.
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
            <Badge variant="ind" className="mb-2">DQE gratuit · plans &amp; PDF en Premium</Badge>
            <h3 className="text-[18px] font-display font-bold">Commencer l'estimation</h3>
            <p className="text-muted text-[13.5px] mt-1.5 leading-relaxed">
              Déposez vos plans avec Premium (fondation, étages, coupe, plomberie, électricité, poutraison, toiture, coffrage) ou saisissez vos dimensions gratuitement :
              chaque type de plan est lu et calculé avec le module qui lui correspond. Vous <b className="text-ink">modifiez chaque prix unitaire</b> ; le DQE est gratuit, l'export PDF est Premium.
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
                {POLITIQUES_RESUME.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] text-muted leading-snug">
                    <Shield size={14} className="shrink-0 mt-0.5 text-indigo" />
                    <span>{p}</span>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => setConditions(true)}
                    className="text-[12.5px] font-semibold text-indigo underline-offset-2 hover:underline">
                    Lire les conditions d'utilisation complètes
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
      <Conditions ouvert={conditions} onFermer={() => setConditions(false)} />
    </div>
  )
}

/* ─── Footer ────────────────────────────────────────────────────────────────── */
export function Footer({ prix }) {
  const [conditions, setConditions] = useState(false)
  const version = prix?.version || PRIX_VERSION
  const date = prix?.date || PRIX_DATE
  return (
    <footer className="mt-auto border-t border-line bg-card/60">
      <div className="max-w-[1180px] mx-auto px-[18px] py-6 flex flex-wrap gap-3.5 justify-between items-center text-[12.5px] text-muted">
        <span className="flex items-center gap-2">
          <LogoMark size={18} />
          CivilEstimator · Métré &amp; DQE — Bénin · données {version} ({fmtMois(date)})
        </span>
        <span className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => setConditions(true)} className="underline-offset-2 hover:text-ink hover:underline">Conditions d'utilisation</button>
          <Badge variant="ind"><Shield size={13} /> FCFA · TVA 18 % · UEMOA</Badge>
        </span>
      </div>
      <Conditions ouvert={conditions} onFermer={() => setConditions(false)} />
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
