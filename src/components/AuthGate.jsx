// src/components/AuthGate.jsx
// Page d'accueil publique : présente CivilEstimator sans connexion (exigence Google pour la validation
// de la marque), avec liens vers la politique de confidentialité et les conditions. Le bouton
// « Continuer avec Google » ouvre la connexion (compte Google obligatoire pour utiliser l'application).
import React from 'react'
import { ShieldCheck, Calculator, Ruler, FileText } from 'lucide-react'
import { Card, Button } from './ui/index.jsx'
import { LogoMark, LogoWord } from './Logo.jsx'
import HeroDecor from './HeroDecor.jsx'
import { useAuth } from '../lib/auth.jsx'

const Google = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
)

const FONCTIONS = [
  { Icone: Ruler, t: 'Métré automatique', d: 'Quantités de gros œuvre calculées à partir de vos dimensions ou de vos plans, selon le Guide du métré (Bénin).' },
  { Icone: Calculator, t: 'DQE en francs CFA', d: 'Devis quantitatif estimatif avec sous-détail des prix unitaires, sur la base du barème RPR, que vous pouvez ajuster ligne par ligne.' },
  { Icone: FileText, t: 'Projets enregistrés', d: 'Vos projets sont rattachés à votre compte et retrouvables à chaque visite ; export PDF professionnel du devis.' },
]

export default function AuthGate() {
  const { connecterGoogle, erreur } = useAuth()
  return (
    <div className="relative min-h-screen overflow-hidden gradient-hero animate-drift flex flex-col">
      <HeroDecor dense />
      <main className="relative z-10 flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-[900px] grid gap-5 md:grid-cols-[1.25fr_1fr] items-start">
          <Card className="p-6 sm:p-7" accent="laterite">
            <div className="flex items-center gap-3">
              <LogoMark size={48} glow />
              <LogoWord />
            </div>
            <h1 className="mt-5 font-display font-bold text-[24px] leading-tight">CivilEstimator</h1>
            <p className="mt-1 font-display font-semibold text-[15px] text-muted">Métré et devis estimatif (DQE) pour la construction au Bénin</p>
            <p className="mt-3 text-[13.5px] text-muted leading-relaxed">
              CivilEstimator calcule les quantités, le devis quantitatif estimatif et le sous-détail des prix de vos projets
              de construction, en francs CFA. Il s'adresse aux professionnels du bâtiment et aux particuliers qui préparent un chantier.
            </p>
            <ul className="mt-4 space-y-3">
              {FONCTIONS.map(({ Icone, t, d }) => (
                <li key={t} className="flex items-start gap-3">
                  <Icone size={18} className="mt-0.5 shrink-0 text-laterite" aria-hidden="true" />
                  <div>
                    <b className="text-[13.5px]">{t}</b>
                    <p className="text-[12.5px] text-muted leading-relaxed">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 text-center shadow-glow" accent="indigo">
            <h2 className="font-display font-bold text-[18px]">Connectez-vous pour continuer</h2>
            <p className="mt-1.5 text-[13px] text-muted">Votre compte Google crée votre espace : vos projets y sont enregistrés et retrouvables à chaque visite.</p>
            <Button onClick={connecterGoogle} variant="outline" size="lg" className="mt-5 w-full"><Google /> Continuer avec Google</Button>
            {erreur && <p role="alert" className="mt-3 text-[12.5px] text-laterite-deep">{erreur}</p>}
            <p className="mt-4 flex items-start gap-1.5 text-left text-[11.5px] text-muted">
              <ShieldCheck size={14} className="shrink-0 mt-0.5 text-jade" />
              Seuls votre nom, votre e-mail et votre photo de profil Google sont utilisés. Aucun mot de passe n'est géré par l'application.
              Détails dans notre <a className="underline text-indigo" href="/confidentialite.html">politique de confidentialité</a>.
            </p>
          </Card>
        </div>
      </main>
      <footer className="relative z-10 px-4 pb-6">
        <div className="mx-auto max-w-[900px] rounded-xl2 bg-card/90 border border-line px-4 py-3 text-[12px] text-muted flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <a className="underline-offset-2 hover:text-ink hover:underline" href="/confidentialite.html">Politique de confidentialité</a>
          <a className="underline-offset-2 hover:text-ink hover:underline" href="/conditions.html">Conditions d'utilisation</a>
          <a className="underline-offset-2 hover:text-ink hover:underline" href="mailto:archinova87@gmail.com">Contact</a>
          <span>© ArchiNova</span>
        </div>
      </footer>
    </div>
  )
}
