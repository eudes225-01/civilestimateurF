// src/components/AuthGate.jsx
// Page d'accueil publique (visible sans connexion, exigence Google pour la validation de la marque).
// Trois blocs sans fond, sur toute la largeur, posés directement sur le fond animé :
// 1) présentation de CivilEstimator, 2) connexion Google, 3) liens légaux et contact.
import React from 'react'
import { ShieldCheck, Calculator, Ruler, FileText } from 'lucide-react'
import { LogoMark } from './Logo.jsx'
import HeroDecor from './HeroDecor.jsx'
import { useAuth } from '../lib/auth.jsx'

const Google = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
)

// Même lien « ArchiNova » que le pied de page de l'application (VITE_PORTFOLIO_URL).
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || ''

const FONCTIONS = [
  { Icone: Ruler, t: 'Métré automatique', d: 'Quantités de gros œuvre calculées à partir de vos dimensions ou de vos plans, selon le Guide du métré (Bénin).' },
  { Icone: Calculator, t: 'DQE en francs CFA', d: 'Devis quantitatif estimatif avec sous-détail des prix unitaires, sur la base du barème RPR que vous ajustez ligne par ligne.' },
  { Icone: FileText, t: 'Projets enregistrés', d: 'Vos projets sont rattachés à votre compte et retrouvables à chaque visite, avec export PDF professionnel du devis.' },
]

// Lisibilité du texte blanc sur le fond en mouvement (sans aucun cadre derrière).
const OMBRE = { textShadow: '0 1px 14px rgba(20,29,82,0.45), 0 0 2px rgba(20,29,82,0.25)' }
const delai = (s) => ({ animationDelay: `${s}s` })

export default function AuthGate() {
  const { connecterGoogle, erreur } = useAuth()
  return (
    <div className="relative min-h-screen overflow-hidden gradient-hero animate-drift flex flex-col text-white" style={OMBRE}>
      <HeroDecor dense />

      <main className="relative z-10 flex-1 flex flex-col w-full px-6 sm:px-10 lg:px-16">
        {/* ── 1. Présentation ─────────────────────────────────────────────── */}
        <section className="w-full pt-10 sm:pt-14 pb-10 sm:pb-12 animate-fade-up">
          <div className="flex items-center gap-4">
            <LogoMark size={64} glow />
            <div className="leading-tight">
              <h1 className="font-display font-bold text-[30px] sm:text-[40px] tracking-tight">CivilEstimator</h1>
              <p className="text-[13px] sm:text-[14px] text-white/85">Métré &amp; DQE · Bénin</p>
            </div>
          </div>
          <p className="mt-6 max-w-[760px] font-display font-semibold text-[19px] sm:text-[24px] leading-snug">
            Du relevé sur plan au devis estimatif, en francs CFA.
          </p>
          <p className="mt-3 max-w-[760px] text-[14px] sm:text-[15px] text-white/90 leading-relaxed">
            CivilEstimator calcule les quantités, le devis quantitatif estimatif (DQE) et le sous-détail des prix de vos projets
            de construction. Il s'adresse aux professionnels du bâtiment et aux particuliers qui préparent un chantier.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-3 md:gap-0">
            {FONCTIONS.map(({ Icone, t, d }, i) => (
              <li key={t} className={`animate-fade-up md:px-8 first:md:pl-0 last:md:pr-0 ${i > 0 ? 'md:border-l md:border-white/30' : ''}`} style={delai(0.15 + i * 0.12)}>
                <span className="inline-grid place-items-center w-11 h-11 rounded-full border-2 border-white/70"><Icone size={20} aria-hidden="true" /></span>
                <h2 className="mt-3 font-display font-semibold text-[16px]">{t}</h2>
                <p className="mt-1 text-[13px] sm:text-[13.5px] text-white/85 leading-relaxed">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 2. Connexion ────────────────────────────────────────────────── */}
        <section className="w-full py-9 sm:py-11 border-t border-white/30 flex flex-col items-center text-center animate-fade-up" style={delai(0.5)}>
          <h2 className="font-display font-bold text-[22px] sm:text-[26px]">Connectez-vous pour continuer</h2>
          <p className="mt-2 max-w-[520px] text-[13.5px] sm:text-[14px] text-white/90">
            Votre compte Google crée votre espace : vos projets y sont enregistrés et retrouvables à chaque visite.
          </p>
          <button
            type="button"
            onClick={connecterGoogle}
            className="mt-6 inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-3 text-[15px] font-semibold text-ink shadow-glow transition hover:scale-[1.03] hover:shadow-glow-lat active:scale-[0.98] w-full sm:w-auto sm:min-w-[320px]"
            style={{ textShadow: 'none' }}
          >
            <Google /> Continuer avec Google
          </button>
          {erreur && <p role="alert" className="mt-3 text-[13px] font-semibold">{erreur}</p>}
          <p className="mt-5 max-w-[560px] text-[12px] sm:text-[12.5px] text-white/85 leading-relaxed">
            <ShieldCheck size={14} className="inline -mt-0.5 mr-1.5" aria-hidden="true" />
            <span>
              Seuls votre nom, votre e-mail et votre photo de profil Google sont utilisés. Aucun mot de passe n'est géré par l'application.
              Détails dans notre <a className="underline underline-offset-2 font-semibold" href="/confidentialite.html">politique de confidentialité</a>.
            </span>
          </p>
        </section>
      </main>

      {/* ── 3. Liens légaux et contact ──────────────────────────────────────── */}
      <footer className="relative z-10 w-full px-6 sm:px-10 lg:px-16 pb-6 animate-fade-up" style={delai(0.65)}>
        <div className="w-full border-t border-white/30 pt-5 flex flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-2 text-[12.5px] text-white/90">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Informations légales">
            <a className="underline-offset-4 hover:underline" href="/confidentialite.html">Politique de confidentialité</a>
            <a className="underline-offset-4 hover:underline" href="/conditions.html">Conditions d'utilisation</a>
            <a className="underline-offset-4 hover:underline" href="mailto:archinova87@gmail.com">Contact</a>
          </nav>
          <span>
            © {new Date().getFullYear()}{' '}
            {PORTFOLIO_URL ? (
              <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">ArchiNova</a>
            ) : (
              <span className="font-semibold">ArchiNova</span>
            )}{' '}
            — Tous droits réservés
          </span>
        </div>
      </footer>
    </div>
  )
}
