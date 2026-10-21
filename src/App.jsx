// src/App.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { FileText, Layers, Table, Ruler, FileDown, Home, ArrowRight, ArrowLeft, Lock } from 'lucide-react'
import { Onboarding, Footer } from './components/Shell.jsx'
import { LogoMark, LogoWord } from './components/Logo.jsx'
import TabTransition from './components/TabTransition.jsx'
import TabProjet from './components/tabs/TabProjet.jsx'
import TabNiveaux from './components/tabs/TabNiveaux.jsx'
import TabPrix from './components/tabs/TabPrix.jsx'
import TabDQE from './components/tabs/TabDQE.jsx'
import { estPayant, contenuAccessible, paywallAffiche } from './lib/acces.js'
import { TRANSITION_MS } from './lib/transition.js'
import TabExport from './components/tabs/TabExport.jsx'
import { PRIX, PRIX_VERSION, PRIX_DATE } from './lib/metre.js'
import { api } from './lib/api.js'
import { plansManquants } from './lib/planGate.js'
import { useAuth } from './lib/auth.jsx'
import { useAbonnement } from './lib/abonnement.js'
import Paywall from './components/Paywall.jsx'
import AuthGate from './components/AuthGate.jsx'
import AccountMenu from './components/AccountMenu.jsx'
import PremiumModal from './components/PremiumModal.jsx'
import { EtiquettePremium } from './components/StatutBadge.jsx'
import { sauverProjet, chargerProjet, instantane } from './lib/projets.js'
import { metrerProjet, PARAMS_DEFAUT, RATIOS_ACIER_DEFAUT, FONDATION_DEFAUT } from './lib/metre.js'

const TABS = [
  { k: 'projet',  lab: 'Projet & plan',     Ic: FileText, col: 'indigo'   },
  { k: 'niveaux', lab: 'Niveaux & métré', Ic: Layers,   col: 'lagune'   },
  { k: 'prix',    lab: 'Prix',              Ic: Table,    col: 'soleil'   },
  { k: 'dqe',     lab: 'DQE',               Ic: Ruler,    col: 'laterite' },
  { k: 'export',  lab: 'Export PDF',        Ic: FileDown, col: 'jade',     payant: estPayant('export') },
]

const projVide = () => ({ titre: '', mo: '', entreprise: '', ref: '', ville: '' })
const paramsVides = () => ({ ...PARAMS_DEFAUT, ratiosAcier: { ...RATIOS_ACIER_DEFAUT }, fondation: { ...FONDATION_DEFAUT } })
const niveauxVides = () => [{
  nom: 'Rez-de-chaussée', rez: true, HSP: '', plancher: 'dallePleine',
  surfPlancher: '', tremies: '',
  pieces: [{ nom: '', L: '', l: '', H: '', portes: '', fenetres: '' }],
  murs: [], poteaux: [], poutres: [],
}]

export default function App() {
  const { actif: comptes, chargement, session, deconnecter, supprimerCompte } = useAuth()
  // Point d'entrée unique : une seule expérience, celle de l'ancien profil « professionnel »
  // (édition des prix, sous-détails, multi-niveaux, export DQE) pour tout le monde.
  const [started, setStarted] = useState(false)
  const [tab, setTab] = useState('projet')
  const [transitioning, setTransitioning] = useState(false)
  const [pendingTab, setPendingTab] = useState(null)

  // Abonnement : seuls le dépôt de plans et l'export PDF sont Premium (statut « premium » ou « admin »).
  // Tout le reste, DQE compris, est gratuit (statut « standard »).
  const abo = useAbonnement(chargement ? undefined : (session?.user?.id ?? null))
  const payant = estPayant
  const [premiumOuvert, setPremiumOuvert] = useState(false) // fenêtre « récapitulatif + paiement »
  // Au retour de FedaPay (paiement confirmé ou non), la fenêtre s'ouvre toute seule avec le résultat.
  useEffect(() => { if (abo.retour) setPremiumOuvert(true) }, [abo.retour])


  // Plans déposés (un tableau de fichiers par type) : l'étape « Projet & plan » ne
  // laisse passer à la suite que si tous les plans obligatoires y figurent.
  const [depots, setDepots] = useState({})
  // Projet rouvert : les fichiers ne sont pas conservés, mais leurs noms le sont — ils valent dépôt pour le verrou.
  const [conserves, setConserves] = useState({})
  const manquants = plansManquants(Object.fromEntries([...new Set([...Object.keys(conserves), ...Object.keys(depots)])]
    .map((k) => [k, depots[k]?.length ? depots[k] : (conserves[k] || [])])))
  // Les plans obligatoires ne s'imposent qu'aux comptes qui peuvent déposer des plans (Premium / admin) :
  // un compte standard saisit ses dimensions à la main et avance sans dépôt.
  const verrou = abo.acces && manquants.length > 0
  const [refus, setRefus] = useState(false)

  const tabIndex = TABS.findIndex((t) => t.k === tab)
  const isFirstTab = tabIndex <= 0
  const isLastTab = tabIndex >= TABS.length - 1

  // Passage d'un onglet à l'autre : transition de 5 s minimum.
  const switchTab = (k) => {
    if (k === tab || transitioning) return
    // Accès refusé : toute étape autre que la première exige les plans obligatoires.
    if (verrou && TABS.findIndex((t) => t.k === k) > 0) {
      setRefus(true)
      if (tab !== 'projet') setTab('projet')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setRefus(false)
    // Étape Premium (export PDF) sans abonnement : on affiche directement l'écran d'abonnement (pas de transition).
    if (payant(k) && !abo.acces) {
      setTab(k)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setPendingTab(k)
    setTransitioning(true)
    setTimeout(() => {
      setTab(k)
      setTransitioning(false)
      setPendingTab(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, TRANSITION_MS)
  }

  const goToStep = (offset) => {
    const next = TABS[tabIndex + offset]
    if (next) switchTab(next.k)
  }

  const [proj, setProj] = useState(projVide)
  const [params, setParams] = useState(paramsVides)
  const [levels, setLevels] = useState(niveauxVides)
  const [prix, setPrix] = useState(PRIX.map((p) => ({ ...p, pu: p.sac ?? p.bi })))
  // Version du barème affichée (PDF, onglet Prix, pied de page).
  const [prixInfo, setPrixInfo] = useState({ version: PRIX_VERSION, date: PRIX_DATE, source: 'local' })

  // Barème de prix servi par le backend (data/prix.json) : mis à jour sans toucher
  // au code. Sans backend (VITE_API_URL vide) ou en cas d'erreur, la base intégrée
  // au moteur reste en place. Un prix que l'utilisateur a modifié à la main est
  // conservé ; seuls les prix encore « par défaut » suivent la nouvelle base.
  useEffect(() => {
    let annule = false
    api.prix().then((r) => {
      if (annule || !r || !Array.isArray(r.postes)) return
      const nouveau = new Map(r.postes.map((p) => [p.code, p]))
      setPrix((cur) => cur.map((p) => {
        const n = nouveau.get(p.code)
        if (!n) return p
        const ancienDefaut = p.sac ?? p.bi
        const modifie = p.pu !== ancienDefaut
        return { ...p, designation: n.designation, unite: n.unite, bi: n.bi, sac: n.sac, pu: modifie ? p.pu : (n.sac ?? n.bi) }
      }))
      setPrixInfo({ version: r.version, date: r.date, source: r.source || 'backend' })
    }).catch(() => {})
    return () => { annule = true }
  }, [])

  // ── Projets enregistrés en base ──
  const [projetId, setProjetId] = useState(null)
  const [etatSauvegarde, setEtatSauvegarde] = useState('idle')
  const minuteur = useRef(null)
  const sautSauvegarde = useRef(false) // vrai juste après l'ouverture d'un projet : rien de modifié à enregistrer

  const sauvegarder = async () => {
    setEtatSauvegarde('saving')
    try {
      const r = await sauverProjet({ id: projetId, titre: proj.titre, data: instantane({ proj, params, levels, prix, depots, conserves }) })
      if (!projetId) setProjetId(r.id)
      setEtatSauvegarde('saved')
    } catch { setEtatSauvegarde('error') }
  }

  // Enregistrement automatique (2,5 s après la dernière modification) une fois le projet créé.
  useEffect(() => {
    if (!comptes || !projetId) return undefined
    if (sautSauvegarde.current) { sautSauvegarde.current = false; return undefined }
    clearTimeout(minuteur.current)
    minuteur.current = setTimeout(() => { sauvegarder() }, 2500)
    return () => clearTimeout(minuteur.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj, params, levels, prix, depots])

  const ouvrirProjet = async (id) => {
    try {
      const p = await chargerProjet(id)
      const d = p.data || {}
      clearTimeout(minuteur.current)
      sautSauvegarde.current = true
      setProj({ ...projVide(), ...(d.proj || {}) })
      setParams({ ...paramsVides(), ...(d.params || {}) })
      setLevels(Array.isArray(d.levels) && d.levels.length ? d.levels : niveauxVides())
      setPrix((cur) => cur.map((x) => ({ ...x, pu: d.prixModifies && x.code in d.prixModifies ? d.prixModifies[x.code] : (x.sac ?? x.bi) })))
      setDepots({}); setConserves(d.plans || {})
      setProjetId(p.id); setEtatSauvegarde('idle'); setStarted(true); setTab('projet'); setRefus(false)
    } catch { setEtatSauvegarde('error') }
  }

  const nouveauProjet = () => {
    clearTimeout(minuteur.current)
    setProj(projVide()); setParams(paramsVides()); setLevels(niveauxVides())
    setPrix((cur) => cur.map((x) => ({ ...x, pu: x.sac ?? x.bi })))
    setDepots({}); setConserves({}); setProjetId(null); setEtatSauvegarde('idle'); setTab('projet'); setRefus(false)
  }

  const { totaux, alertes } = useMemo(() => metrerProjet(levels, params), [levels, params])

  // Comptes actifs : la connexion Google est obligatoire pour utiliser l'application.
  if (comptes && chargement) return <div className="min-h-screen grid place-items-center text-muted text-[13px]">Chargement…</div>
  if (comptes && !session) return <AuthGate />

  // Écran d'accueil : choix du profil + acceptation des politiques
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col">
        <Onboarding onStart={() => setStarted(true)} />
        <Footer prix={prixInfo} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-md border-b border-line">
        <div className="max-w-[1180px] mx-auto px-[18px] flex items-center gap-3 h-[64px]">
          <button className="flex items-center gap-2.5 group" onClick={() => setStarted(false)} title="Revenir à l'accueil">
            <span className="group-hover:scale-105 transition-transform">
              <LogoMark size={38} glow />
            </span>
            <LogoWord />
          </button>

          <span className="flex-1" />
          <button
            onClick={() => setStarted(false)}
            className="text-muted hover:text-indigo transition-colors p-1.5 rounded-lg hover:bg-muted-bg"
            title="Revenir à l'accueil"
          >
            <Home size={17} />
          </button>
          {comptes && session?.user && (
            <AccountMenu user={session.user} statut={abo.statut} finAbonnement={abo.etat?.finAbonnement}
              projetId={projetId} etat={etatSauvegarde}
              onSave={sauvegarder} onOpen={ouvrirProjet} onNew={nouveauProjet}
              onSignOut={deconnecter} onDeleteAccount={supprimerCompte} onPremium={() => setPremiumOuvert(true)} />
          )}
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
                {t.payant && <EtiquettePremium className={on || loading ? '!bg-white/20 !text-white !border-white/30' : ''} />}
                {((verrou && i > 0) || (t.payant && !abo.acces)) && <Lock size={12} className="opacity-60" />}
              </button>
            )
          })}
        </div>

        <div key={tab} className="py-5 animate-fade-up">
          {tab === 'projet'  && <TabProjet  proj={proj} setProj={setProj} setLevels={setLevels} setParams={setParams} depots={depots} setDepots={setDepots} premium={abo.acces} onPremium={() => setPremiumOuvert(true)} />}
          {tab === 'niveaux' && <TabNiveaux levels={levels} setLevels={setLevels} params={params} setParams={setParams} premium={abo.acces} onPremium={() => setPremiumOuvert(true)} />}
          {tab === 'prix'    && <TabPrix    prix={prix} setPrix={setPrix} prixInfo={prixInfo} />}
          {paywallAffiche(tab, abo.acces) && (
            <Paywall etape={TABS.find((t) => t.k === tab)?.lab} abo={abo} onPremium={() => setPremiumOuvert(true)} onRetour={() => setTab('dqe')} />
          )}
          {tab === 'dqe'     && contenuAccessible('dqe', abo.acces) && <TabDQE     totaux={totaux} prix={prix} params={params} alertes={alertes} prixInfo={prixInfo} />}
          {tab === 'export'  && contenuAccessible('export', abo.acces) && <TabExport  proj={proj} totaux={totaux} prix={prix} params={params} alertes={alertes} prixInfo={prixInfo} />}
        </div>

        {verrou && refus && (
          <div role="alert" className="mb-3 rounded-xl2 border border-laterite/30 bg-laterite-soft px-4 py-3 text-[13px] text-laterite-deep flex gap-2.5">
            <Lock size={16} className="shrink-0 mt-0.5" />
            <span>
              Accès à l'étape suivante refusé : déposez d'abord {manquants.length > 1 ? 'les plans manquants' : 'le plan manquant'} —{' '}
              <b>{manquants.map((m) => m.lab).join(', ')}</b>.
            </span>
          </div>
        )}

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

      <Footer prix={prixInfo} />

      <PremiumModal ouvert={premiumOuvert} onFermer={() => setPremiumOuvert(false)} abo={abo} />

      {transitioning && pendingTab && (
        <TabTransition
          label={TABS.find((t) => t.k === pendingTab)?.lab || ''}
          color={TABS.find((t) => t.k === pendingTab)?.col || 'indigo'}
        />
      )}
    </div>
  )
}
