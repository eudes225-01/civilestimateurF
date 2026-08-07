// src/App.jsx
import React, { useState, useMemo } from 'react'
import { FileText, Layers, Table, Ruler, FileDown, HardHat, User, LogOut, ArrowRight, ArrowLeft } from 'lucide-react'
import { PromoBanner, Onboarding, Footer } from './components/Shell.jsx'
import { LogoMark, LogoWord } from './components/Logo.jsx'
import TabTransition from './components/TabTransition.jsx'
import TabProjet from './components/tabs/TabProjet.jsx'
import TabNiveaux from './components/tabs/TabNiveaux.jsx'
import TabPrix from './components/tabs/TabPrix.jsx'
import TabDQE from './components/tabs/TabDQE.jsx'
import TabExport from './components/tabs/TabExport.jsx'
import { metrerProjet, PARAMS_DEFAUT, RATIOS_ACIER_DEFAUT, FONDATION_DEFAUT, PRIX } from 'civilestimateur-engine'
import { accessState } from './lib/format.js'

const { joursRestants } = accessState()

const TABS = [
  { k: 'projet',  lab: 'Projet & plan',     Ic: FileText, col: 'indigo'   },
  { k: 'niveaux', lab: 'Niveaux & métré', Ic: Layers,   col: 'lagune'   },
  { k: 'prix',    lab: 'Prix',              Ic: Table,    col: 'soleil'   },
  { k: 'dqe',     lab: 'DQE',               Ic: Ruler,    col: 'laterite' },
  { k: 'export',  lab: 'Export PDF',        Ic: FileDown, col: 'jade'     },
]

export default function App() {
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('projet')
  const [transitioning, setTransitioning] = useState(false)
  const [pendingTab, setPendingTab] = useState(null)

  const isPro = profile === 'pro'

  const tabIndex = TABS.findIndex((t) => t.k === tab)
  const isFirstTab = tabIndex <= 0
  const isLastTab = tabIndex >= TABS.length - 1

  // Passage d'un onglet à l'autre : transition de 5 s minimum.
  const switchTab = (k) => {
    if (k === tab || transitioning) return
    setPendingTab(k)
    setTransitioning(true)
    setTimeout(() => {
      setTab(k)
      setTransitioning(false)
      setPendingTab(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 5000)
  }

  const goToStep = (offset) => {
    const next = TABS[tabIndex + offset]
    if (next) switchTab(next.k)
  }

  const [proj, setProj] = useState({
    titre: '', mo: '', entreprise: '', ref: '', ville: '',
  })
  const [params, setParams] = useState({
    ...PARAMS_DEFAUT,
    ratiosAcier: { ...RATIOS_ACIER_DEFAUT },
    fondation: { ...FONDATION_DEFAUT },
  })
  const [levels, setLevels] = useState([
    {
      nom: 'Rez-de-chaussée', rez: true, HSP: '', plancher: 'dallePleine',
      surfPlancher: '', tremies: '',
      pieces: [{ nom: '', L: '', l: '', H: '', portes: '', fenetres: '' }],
      murs: [], poteaux: [], poutres: [],
    },
  ])
  const [prix, setPrix] = useState(PRIX.map((p) => ({ ...p, pu: p.sac ?? p.bi })))

  // ville transmise au moteur pour activer les alertes géotechniques Lot A
  // (contrainte admissible de zone vs fondation choisie) — voir validation.js
  // côté moteur. Sans elle, ces vérifications sont silencieusement ignorées.
  const { totaux, alertes } = useMemo(
    () => metrerProjet(levels, { ...params, ville: proj.ville }),
    [levels, params, proj.ville],
  )

  // Écran d'accueil : choix du profil + acceptation des politiques
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <PromoBanner />
        <Onboarding onStart={setProfile} />
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-md border-b border-line">
        <div className="max-w-[1180px] mx-auto px-[18px] flex items-center gap-3 h-[64px]">
          <button className="flex items-center gap-2.5 group" onClick={() => setProfile(null)} title="Revenir à l'accueil">
            <span className="group-hover:scale-105 transition-transform">
              <LogoMark size={38} glow />
            </span>
            <LogoWord />
          </button>

          <span className="flex-1" />

          <span className={`hidden sm:inline-flex chip border ${isPro ? 'bg-indigo-soft text-indigo border-indigo/20' : 'bg-laterite-soft text-laterite-deep border-laterite/25'}`}>
            {isPro ? <HardHat size={13} /> : <User size={13} />}
            {isPro ? 'Professionnel' : 'Particulier'}
          </span>
          <span className="chip bg-jade-soft text-jade-deep border border-jade/25">
            <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
            Gratuit · J‑{joursRestants}
          </span>
          <button
            onClick={() => setProfile(null)}
            className="text-muted hover:text-laterite transition-colors p-1.5 rounded-lg hover:bg-laterite-soft"
            title="Changer de profil"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <main className="max-w-[1180px] w-full mx-auto px-[18px] pt-5 flex-1">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-card/70 backdrop-blur rounded-xl2 border border-line shadow-soft">
          {TABS.map((t, i) => {
            const on = tab === t.k
            const loading = pendingTab === t.k
            return (
              <button
                key={t.k}
                onClick={() => switchTab(t.k)}
                disabled={transitioning}
                className={
                  'shrink-0 px-3.5 py-2 rounded-[11px] text-[13.5px] font-semibold inline-flex gap-2 items-center transition-all duration-200 disabled:opacity-60 ' +
                  (on || loading
                    ? `text-white bg-${t.col} shadow-soft`
                    : 'text-muted hover:text-ink hover:bg-muted-bg')
                }
              >
                <span className={`font-mono text-[11px] ${on ? 'opacity-80' : 'opacity-50'}`}>{String(i + 1).padStart(2, '0')}</span>
                <t.Ic size={15} /> {t.lab}
              </button>
            )
          })}
        </div>

        <div key={tab} className="py-5 animate-fade-up">
          {tab === 'projet'  && <TabProjet  proj={proj} setProj={setProj} levels={levels} setLevels={setLevels} params={params} setParams={setParams} prix={prix} setPrix={setPrix} isPro={isPro} />}
          {tab === 'niveaux' && <TabNiveaux levels={levels} setLevels={setLevels} params={params} setParams={setParams} ville={proj.ville} />}
          {tab === 'prix'    && <TabPrix    prix={prix} setPrix={setPrix} isPro={isPro} />}
          {tab === 'dqe'     && <TabDQE     totaux={totaux} prix={prix} params={params} alertes={alertes} />}
          {tab === 'export'  && <TabExport  proj={proj} totaux={totaux} prix={prix} params={params} alertes={alertes} isPro={isPro} />}
        </div>

        {/* ── Navigation Précédent / Suivant ── */}
        <div className="flex items-center justify-between gap-3 pb-8 flex-wrap">
          <button
            onClick={() => goToStep(-1)}
            disabled={isFirstTab || transitioning}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] text-[13.5px] font-semibold border border-line-strong text-ink bg-card hover:border-indigo hover:text-indigo transition-all disabled:opacity-40 disabled:pointer-events-none order-1"
          >
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Étape précédente</span><span className="sm:hidden">Précédent</span>
          </button>

          <span className="text-[12px] text-muted font-mono order-3 sm:order-2 w-full sm:w-auto text-center sm:text-left">
            Étape {tabIndex + 1} / {TABS.length}
          </span>

          {!isLastTab ? (
            <button
              onClick={() => goToStep(1)}
              disabled={transitioning}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[11px] text-[13.5px] font-semibold text-white shadow-soft transition-all disabled:opacity-60 disabled:pointer-events-none order-2 sm:order-3 bg-${TABS[tabIndex + 1]?.col || 'indigo'} hover:brightness-105`}
            >
              <span className="hidden sm:inline">Suivant — {TABS[tabIndex + 1]?.lab}</span><span className="sm:hidden">Suivant</span> <ArrowRight size={15} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[11px] text-[13.5px] font-semibold text-jade-deep bg-jade-soft border border-jade/25 order-2 sm:order-3">
              <FileDown size={15} /> Dernière étape
            </span>
          )}
        </div>
      </main>

      <Footer />

      {transitioning && pendingTab && (
        <TabTransition
          label={TABS.find((t) => t.k === pendingTab)?.lab || ''}
          color={TABS.find((t) => t.k === pendingTab)?.col || 'indigo'}
        />
      )}
    </div>
  )
}
