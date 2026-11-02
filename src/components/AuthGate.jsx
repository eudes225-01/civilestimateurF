// src/components/AuthGate.jsx
// Page d'accueil publique (visible sans connexion, exigence Google pour la validation de la marque).
// Trois blocs sans fond, sur toute la largeur, posés directement sur le fond animé :
// 1) présentation de CivilEstimator, 2) connexion Google, 3) liens légaux et contact.
// Mobile (< md) : écran d'application — marque en haut, fonctions en cartes à faire défiler, et feuille blanche
// arrondie en bas qui porte la connexion. Ordinateur (≥ md) : les trois blocs transparents pleine largeur.
// Palette des textes : blanc, or (#FFD166), menthe (#7CF2C8), ciel (#9BD8FF) ; le nom de la marque
// garde ses couleurs d'origine (« Civil » encre, « Estimator » latérite) sur une pastille blanche.
import React, { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Calculator, Ruler, FileText } from 'lucide-react'
import { LogoMark } from './Logo.jsx'
import HeroDecor from './HeroDecor.jsx'
import { useAuth } from '../lib/auth.jsx'

// Même lien « ArchiNova » que le pied de page de l'application (VITE_PORTFOLIO_URL).
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL || ''

const OR = '#f6a823' // soleil (palette de l'application)

const Google = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
)

const FONCTIONS = [
  { Icone: Ruler, couleur: '#f6a823', ico: '#141d52', t: 'Métré automatique', d: 'Quantités de gros œuvre calculées à partir de vos dimensions ou de vos plans, selon le Guide du métré (Bénin).' },
  { Icone: Calculator, couleur: '#0fa36b', ico: '#ffffff', t: 'DQE en francs CFA', d: 'Devis quantitatif estimatif avec sous-détail des prix unitaires, sur la base du barème RPR que vous ajustez ligne par ligne.' },
  { Icone: FileText, couleur: '#1e2a78', ico: '#ffffff', t: 'Projets enregistrés', d: 'Vos projets sont rattachés à votre compte et retrouvables à chaque visite, avec export PDF professionnel du devis.' },
]

// Lisibilité du texte sur le fond en mouvement (sans aucun cadre derrière).
const OMBRE = { textShadow: '0 1px 14px rgba(20,29,82,0.5), 0 0 2px rgba(20,29,82,0.3)' }
const SANS_OMBRE = { textShadow: 'none' }
const delai = (s) => ({ animationDelay: `${s}s` })

/* ─── Aperçu de devis (bureau) ─────────────────────────────────────────────── */
function ApercuDQE() {
  const lignes = [
    ['Terrassement · fouilles', '18,4 m³', '#f6a823', '78%'],
    ['Béton armé · semelles', '4,2 m³', '#0fa36b', '46%'],
    ['Maçonnerie · agglos 15 cm', '126 m²', '#1e2a78', '92%'],
    ['Enduit · façades', '214 m²', '#ffffff', '64%'],
  ]
  return (
    <div className="hidden lg:block rounded-3xl border border-white/30 bg-white/10 backdrop-blur-md p-7 shadow-2xl animate-fade-up" style={delai(0.2)}>
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-[18px]">Devis quantitatif estimatif</h2>
        <span className="rounded-full border border-white/50 px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: OR }}>Exemple</span>
      </div>
      <ul className="mt-5 space-y-4">
        {lignes.map(([t, q, c, w]) => (
          <li key={t}>
            <div className="flex items-baseline justify-between text-[13.5px]"><span>{t}</span><b>{q}</b></div>
            <div className="mt-1.5 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full" style={{ width: w, background: c }} /></div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/25 pt-4 text-[12px] font-semibold">
        {['FCFA', 'TVA 18 %', 'UEMOA', 'Export PDF'].map((x) => <span key={x} className="rounded-full border border-white/40 px-3 py-1">{x}</span>)}
      </div>
    </div>
  )
}

/* ─── Mobile : écran d'application ─────────────────────────────────────────── */
function AccueilMobile({ connecterGoogle, erreur }) {
  const piste = useRef(null)
  const [actif, setActif] = useState(0)
  const surDefilement = () => {
    const el = piste.current
    if (!el || !el.firstElementChild) return
    const pas = el.firstElementChild.offsetWidth + 12
    setActif(Math.min(FONCTIONS.length - 1, Math.max(0, Math.round(el.scrollLeft / pas))))
  }
  const pause = useRef(0)
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => {
      const el = piste.current
      if (!el || !el.firstElementChild || Date.now() < pause.current) return
      const pas = el.firstElementChild.offsetWidth + 12
      const i = Math.round(el.scrollLeft / pas)
      el.scrollTo({ left: ((i + 1) % FONCTIONS.length) * pas, behavior: 'smooth' })
    }, 3500)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="md:hidden relative z-10 flex flex-col min-h-[100dvh]">
      <div className="flex-1 flex flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-5">
        {/* Marque */}
        <div className="mx-auto inline-flex items-center gap-3 animate-fade-up">
          <LogoMark size={50} glow />
          <div className="leading-none">
            <h1 className="font-display font-bold text-[23px] tracking-tight text-white">
              Civil<span style={{ color: OR }}>Estimator</span>
            </h1>
            <p className="mt-1.5 text-[11px] font-medium text-white/90">Métré &amp; DQE · Bénin</p>
          </div>
        </div>

        {/* Accroche */}
        <p className="mt-6 text-center font-display font-bold text-[26px] leading-[1.12] tracking-tight animate-fade-up" style={delai(0.1)}>
          Du relevé sur plan <span style={{ color: OR }}>au devis estimatif</span>, en francs CFA.
        </p>
        <p className="mt-3 mx-auto max-w-[330px] text-center text-[14px] leading-snug text-white animate-fade-up" style={delai(0.18)}>
          Quantités, DQE et sous-détail des prix de vos chantiers, pour les <b>professionnels</b> et les <b>particuliers</b>.
        </p>

        {/* Fonctions : cartes à faire défiler */}
        <div className="mt-5 -mx-5 animate-fade-up" style={delai(0.26)}>
          <div
            ref={piste}
            onScroll={surDefilement}
            onTouchStart={() => { pause.current = Date.now() + 8000 }}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 scroll-px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FONCTIONS.map(({ Icone, couleur, ico, t, d }) => (
              <article key={t} className="snap-start shrink-0 w-[78%] max-w-[300px] rounded-3xl border border-white/30 bg-white/15 backdrop-blur-md p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full ring-2 ring-white/80" style={{ background: couleur, color: ico, ...SANS_OMBRE }}>
                    <Icone size={20} aria-hidden="true" />
                  </span>
                  <h2 className="font-display font-bold text-[16.5px] leading-tight" style={{ color: OR }}>{t}</h2>
                </div>
                <p className="mt-2.5 text-[13px] leading-snug text-white">{d}</p>
              </article>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
            {FONCTIONS.map(({ t }, i) => (
              <span key={t} className={`h-1.5 rounded-full transition-all duration-300 ${i === actif ? 'w-5 bg-white' : 'w-1.5 bg-white/45'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Feuille de connexion */}
      <section
        className="relative rounded-t-[32px] bg-white text-ink px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(20,29,82,0.35)] animate-fade-up"
        style={{ ...SANS_OMBRE, animationDelay: '0.34s' }}
      >
        <div className="mx-auto h-1.5 w-11 rounded-full bg-line" aria-hidden="true" />
        <h2 className="mt-3.5 text-center font-display font-bold text-[19px] text-ink">
          Connectez-vous pour <span className="text-laterite">continuer</span>
        </h2>
        <p className="mt-1.5 text-center text-[13px] leading-snug text-muted">
          Votre compte Google crée votre espace : vos projets y sont enregistrés et retrouvables à chaque visite.
        </p>
        <button
          type="button"
          onClick={connecterGoogle}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white py-3.5 text-[15.5px] font-bold text-indigo shadow-[0_6px_18px_rgba(20,29,82,0.18)] transition active:scale-[0.98]"
        >
          <Google /> Continuer avec Google
        </button>
        {erreur && <p role="alert" className="mt-2 text-center text-[12.5px] font-bold text-laterite-deep">{erreur}</p>}
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-muted">
          <ShieldCheck size={15} className="mt-px shrink-0 text-jade" aria-hidden="true" />
          <span>
            Seuls votre nom, votre e-mail et votre photo de profil Google sont utilisés. Aucun mot de passe n'est géré par l'application.
            Détails dans notre <a className="font-semibold text-indigo underline underline-offset-2" href="/confidentialite.html">politique de confidentialité</a>.
          </span>
        </p>
        <nav className="mt-3 flex items-center justify-center gap-x-5 border-t border-line pt-2.5 text-[12px] font-semibold text-indigo" aria-label="Informations légales">
          <a href="/confidentialite.html">Confidentialité</a>
          <a href="/conditions.html">Conditions</a>
          <a href="mailto:archinova87@gmail.com">Contact</a>
        </nav>
        <p className="mt-2 text-center text-[11px] text-muted">
          © {new Date().getFullYear()}{' '}
          {PORTFOLIO_URL ? (
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-laterite">ArchiNova</a>
          ) : (
            <span className="font-bold text-laterite">ArchiNova</span>
          )}{' '}
          — Tous droits réservés
        </p>
      </section>
    </div>
  )
}

export default function AuthGate() {
  const { connecterGoogle, erreur } = useAuth()
  return (
    <div className="relative min-h-[100dvh] overflow-hidden gradient-hero animate-drift flex flex-col text-white" style={OMBRE}>
      <HeroDecor dense compactMobile />

      <AccueilMobile connecterGoogle={connecterGoogle} erreur={erreur} />

      {/* Ordinateur : trois blocs transparents pleine largeur */}
      <div className="hidden md:flex md:flex-col md:flex-1 relative z-10">
      <main className="relative z-10 flex-1 flex flex-col w-full px-6 sm:px-10 lg:px-16">
        {/* ── 1. Présentation ─────────────────────────────────────────────── */}
        <section className="w-full pt-9 sm:pt-12 pb-10 sm:pb-12 animate-fade-up">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-center">
          <div>
          {/* Marque : couleurs d'origine du nom, sur pastille blanche pour rester lisible */}
          <div className="inline-flex items-center gap-4">
            <LogoMark size={60} glow />
            <div className="leading-tight">
              <h1 className="font-display font-bold text-[24px] sm:text-[34px] tracking-tight text-white">
                Civil<span style={{ color: OR }}>Estimator</span>
              </h1>
              <p className="text-[11.5px] sm:text-[13px] font-medium text-white/90">Métré &amp; DQE · Bénin</p>
            </div>
          </div>

          <p className="mt-7 max-w-[820px] font-display font-bold text-[24px] sm:text-[34px] lg:text-[48px] leading-[1.08] tracking-tight">
            Du relevé sur plan <span style={{ color: OR }}>au devis estimatif</span>, en francs CFA.
          </p>
          <p className="mt-3.5 max-w-[760px] text-[14.5px] sm:text-[16px] text-white leading-relaxed">
            <b style={{ color: OR }}>CivilEstimator</b> calcule les quantités, le devis quantitatif estimatif (DQE) et le sous-détail des prix de vos projets
            de construction. Il s'adresse aux <b>professionnels du bâtiment</b> et aux <b>particuliers</b> qui préparent un chantier.
          </p>

          </div>
          <ApercuDQE />
          </div>
          <ul className="mt-12 grid gap-7 md:grid-cols-3 md:gap-0">
            {FONCTIONS.map(({ Icone, couleur, ico, t, d }, i) => (
              <li key={t} className={`animate-fade-up md:px-8 first:md:pl-0 last:md:pr-0 ${i > 0 ? 'md:border-l md:border-white/30' : ''}`} style={delai(0.15 + i * 0.12)}>
                <span className="inline-grid place-items-center w-12 h-12 rounded-full shadow-lg ring-2 ring-white/80" style={{ background: couleur, color: ico, ...SANS_OMBRE }}>
                  <Icone size={22} aria-hidden="true" />
                </span>
                <h2 className="mt-3.5 font-display font-bold text-[18px] sm:text-[19px]" style={{ color: OR }}>{t}</h2>
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
            <ShieldCheck size={15} className="inline -mt-0.5 mr-1.5" style={{ color: '#ffffff' }} aria-hidden="true" />
            <span>
              Seuls votre <b style={{ color: '#ffffff' }}>nom</b>, votre <b style={{ color: '#ffffff' }}>e-mail</b> et votre <b style={{ color: '#ffffff' }}>photo de profil</b> Google sont utilisés.
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
    </div>
  )
}
