// src/components/AuthGate.jsx
// Page d'accueil publique (visible sans connexion, exigence Google pour la validation de la marque).
// Trois blocs sans fond, sur toute la largeur, posés directement sur le fond animé :
// 1) présentation de CivilEstimator, 2) connexion Google, 3) liens légaux et contact.
// Palette des textes : blanc, or (#FFD166), menthe (#7CF2C8), ciel (#9BD8FF) ; le nom de la marque
// garde ses couleurs d'origine (« Civil » encre, « Estimator » latérite) sur une pastille blanche.
import React from 'react'
import { ShieldCheck, Calculator, Ruler, FileText } from 'lucide-react'
import { LogoMark } from './Logo.jsx'
import HeroDecor from './HeroDecor.jsx'
import { useAuth } from '../lib/auth.jsx'

// Même lien « ArchiNova » que le pied de page de l'application (VITE_PORTFOLIO_URL).
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || ''

const OR = '#FFD166'

const Google = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
)

const FONCTIONS = [
  { Icone: Ruler, couleur: '#FFD166', t: 'Métré automatique', d: 'Quantités de gros œuvre calculées à partir de vos dimensions ou de vos plans, selon le Guide du métré (Bénin).' },
  { Icone: Calculator, couleur: '#7CF2C8', t: 'DQE en francs CFA', d: 'Devis quantitatif estimatif avec sous-détail des prix unitaires, sur la base du barème RPR que vous ajustez ligne par ligne.' },
  { Icone: FileText, couleur: '#9BD8FF', t: 'Projets enregistrés', d: 'Vos projets sont rattachés à votre compte et retrouvables à chaque visite, avec export PDF professionnel du devis.' },
]

// Lisibilité du texte sur le fond en mouvement (sans aucun cadre derrière).
const OMBRE = { textShadow: '0 1px 14px rgba(20,29,82,0.5), 0 0 2px rgba(20,29,82,0.3)' }
const SANS_OMBRE = { textShadow: 'none' }
const delai = (s) => ({ animationDelay: `${s}s` })

export default function AuthGate() {
  const { connecterGoogle, erreur } = useAuth()
  return (
    <div className="relative min-h-screen overflow-hidden gradient-hero animate-drift flex flex-col text-white" style={OMBRE}>
      <HeroDecor dense />

      <main className="relative z-10 flex-1 flex flex-col w-full px-6 sm:px-10 lg:px-16">
        {/* ── 1. Présentation ─────────────────────────────────────────────── */}
        <section className="w-full pt-9 sm:pt-12 pb-10 sm:pb-12 animate-fade-up">
          {/* Marque : couleurs d'origine du nom, sur pastille blanche pour rester lisible */}
          <div className="inline-flex items-center gap-3.5 rounded-2xl bg-white pl-3 pr-5 py-2.5 shadow-glow" style={SANS_OMBRE}>
            <LogoMark size={52} glow />
            <div className="leading-tight">
              <h1 className="font-display font-bold text-[24px] sm:text-[30px] tracking-tight text-ink">
                Civil<span className="text-laterite">Estimator</span>
              </h1>
              <p className="text-[11.5px] sm:text-[12.5px] font-medium text-muted">Métré &amp; DQE · Bénin</p>
            </div>
          </div>

          <p className="mt-7 max-w-[820px] font-display font-bold text-[24px] sm:text-[34px] leading-tight tracking-tight">
            Du relevé sur plan <span style={{ color: OR }}>au devis estimatif</span>, en francs CFA.
          </p>
          <p className="mt-3.5 max-w-[760px] text-[14.5px] sm:text-[16px] text-white leading-relaxed">
            <b style={{ color: OR }}>CivilEstimator</b> calcule les quantités, le devis quantitatif estimatif (DQE) et le sous-détail des prix de vos projets
            de construction. Il s'adresse aux <b>professionnels du bâtiment</b> et aux <b>particuliers</b> qui préparent un chantier.
          </p>

          <ul className="mt-9 grid gap-7 md:grid-cols-3 md:gap-0">
            {FONCTIONS.map(({ Icone, couleur, t, d }, i) => (
              <li key={t} className={`animate-fade-up md:px-8 first:md:pl-0 last:md:pr-0 ${i > 0 ? 'md:border-l md:border-white/30' : ''}`} style={delai(0.15 + i * 0.12)}>
                <span className="inline-grid place-items-center w-12 h-12 rounded-full shadow-lg" style={{ background: couleur, color: '#141d52', ...SANS_OMBRE }}>
                  <Icone size={22} aria-hidden="true" />
                </span>
                <h2 className="mt-3.5 font-display font-bold text-[18px] sm:text-[19px]" style={{ color: couleur }}>{t}</h2>
                <p className="mt-1.5 text-[13.5px] sm:text-[14px] text-white leading-relaxed">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 2. Connexion ────────────────────────────────────────────────── */}
        <section className="w-full py-9 sm:py-11 border-t border-white/30 flex flex-col items-center text-center animate-fade-up" style={delai(0.5)}>
          <h2 className="font-display font-bold text-[24px] sm:text-[30px]">
            Connectez-vous pour <span style={{ color: OR }}>continuer</span>
          </h2>
          <p className="mt-2.5 max-w-[540px] text-[14px] sm:text-[15px] text-white">
            Votre compte Google crée votre espace : vos projets y sont enregistrés et retrouvables à chaque visite.
          </p>
          <button
            type="button"
            onClick={connecterGoogle}
            className="mt-6 inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-3.5 text-[15.5px] font-bold text-indigo shadow-glow transition hover:scale-[1.03] hover:shadow-glow-lat active:scale-[0.98] w-full sm:w-auto sm:min-w-[340px]"
            style={SANS_OMBRE}
          >
            <Google /> Continuer avec Google
          </button>
          {erreur && <p role="alert" className="mt-3 text-[13px] font-bold" style={{ color: OR }}>{erreur}</p>}
          <p className="mt-5 max-w-[580px] text-[12.5px] sm:text-[13px] text-white leading-relaxed">
            <ShieldCheck size={15} className="inline -mt-0.5 mr-1.5" style={{ color: '#7CF2C8' }} aria-hidden="true" />
            <span>
              Seuls votre <b style={{ color: '#7CF2C8' }}>nom</b>, votre <b style={{ color: '#7CF2C8' }}>e-mail</b> et votre <b style={{ color: '#7CF2C8' }}>photo de profil</b> Google sont utilisés.
              Aucun mot de passe n'est géré par l'application. Détails dans notre{' '}
              <a className="underline underline-offset-2 font-bold hover:opacity-80" style={{ color: OR }} href="/confidentialite.html">politique de confidentialité</a>.
            </span>
          </p>
        </section>
      </main>

      {/* ── 3. Liens légaux et contact ──────────────────────────────────────── */}
      <footer className="relative z-10 w-full px-6 sm:px-10 lg:px-16 pb-6 animate-fade-up" style={delai(0.65)}>
        <div className="w-full border-t border-white/30 pt-5 flex flex-wrap items-center justify-center sm:justify-between gap-x-8 gap-y-2.5 text-[13px] text-white">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Informations légales">
            <a className="font-semibold underline-offset-4 hover:underline" href="/confidentialite.html">Politique de confidentialité</a>
            <a className="font-semibold underline-offset-4 hover:underline" href="/conditions.html">Conditions d'utilisation</a>
            <a className="font-semibold underline-offset-4 hover:underline" href="mailto:archinova87@gmail.com">Contact</a>
          </nav>
          <span>
            © {new Date().getFullYear()}{' '}
            {PORTFOLIO_URL ? (
              <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline-offset-4 hover:underline" style={{ color: OR }}>ArchiNova</a>
            ) : (
              <span className="font-bold" style={{ color: OR }}>ArchiNova</span>
            )}{' '}
            — Tous droits réservés
          </span>
        </div>
      </footer>
    </div>
  )
}
