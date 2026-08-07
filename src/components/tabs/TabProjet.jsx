// src/components/tabs/TabProjet.jsx
import { MapPin, Lock, ArrowDown, Home, User, Phone, FileText, Layers, AlertTriangle } from 'lucide-react'
import React from 'react'
import { Card, Input, Label, Select, SectionTitle, Badge, Hint } from '../ui/index.jsx'
import { FONDATIONS, recommanderFondationProjet } from 'civilestimateur-engine'
import PlanAnalyzer from '../PlanAnalyzer.jsx'

const VILLES = Object.keys(FONDATIONS.villes)

const TYPE_PROJET = [
  'Maison individuelle (plain-pied)',
  'Maison individuelle (R+1)',
  'Maison individuelle (R+2)',
  'Villa avec piscine',
  'Immeuble locatif',
  'Boutique / Commerce',
  'Autre',
]

export default function TabProjet({ proj, setProj, levels, setLevels, params, setParams, prix, setPrix, isPro }) {
  const set = (k, v) => setProj({ ...proj, [k]: v })
  const zone = proj.ville && FONDATIONS.villes[proj.ville]
    ? FONDATIONS.zones[FONDATIONS.villes[proj.ville]]
    : null

  // Recommandation géotechnique Lot A — purement informative : ne modifie
  // jamais levels/params à la place de l'utilisateur. La contrainte
  // admissible reste éditable (params.fondation.contrainteAdmissible),
  // conformément au document Lot A (§2.2 : confirmer/ajuster, pas figer).
  const setFondation = (k, v) => setParams({ ...params, fondation: { ...params.fondation, [k]: v } })
  const reco = zone
    ? recommanderFondationProjet({
        ville: proj.ville,
        systeme: params.systeme,
        contrainteOverride: params.fondation?.contrainteAdmissible,
        contexteSolOverride: params.fondation?.contexteSol,
        nbNiveaux: levels.length,
      })
    : null

  return (
    <div className="grid gap-5">
      {/* ── 1. Analyse de plan (fonction phare) ── */}
      <PlanAnalyzer proj={proj} setProj={setProj} levels={levels} setLevels={setLevels} params={params} setParams={setParams} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── 2. Informations du projet ── */}
        <Card className="p-5 grid gap-4" accent={isPro ? 'indigo' : 'laterite'}>
          <SectionTitle accent={isPro ? 'indigo' : 'laterite'}>
            {isPro ? 'Informations du projet' : 'Mon projet de construction'}
          </SectionTitle>

          {isPro ? (
            /* ─── MODE PROFESSIONNEL ─── */
            <>
              <div>
                <Label>Titre / désignation du projet</Label>
                <Input value={proj.titre} onChange={(e) => set('titre', e.target.value)}
                  placeholder="Ex. : Construction villa R+1 – Cotonou" />
              </div>
              <div>
                <Label>Maître d'ouvrage (MO)</Label>
                <Input value={proj.mo} onChange={(e) => set('mo', e.target.value)}
                  placeholder="Nom du client" />
              </div>
              <div>
                <Label>Entreprise / Bureau d'études</Label>
                <Input value={proj.entreprise} onChange={(e) => set('entreprise', e.target.value)}
                  placeholder="Ex. : Nom de votre entreprise / BET" />
              </div>
              <div>
                <Label>Référence / N° marché</Label>
                <Input value={proj.ref} onChange={(e) => set('ref', e.target.value)}
                  placeholder="Ex. : MO-2026-001" />
              </div>
            </>
          ) : (
            /* ─── MODE PARTICULIER ─── */
            <>
              <div>
                <Label><span className="inline-flex items-center gap-1.5"><User size={13} /> Votre nom complet</span></Label>
                <Input value={proj.mo} onChange={(e) => set('mo', e.target.value)}
                  placeholder="Ex. : Jean-Baptiste Ahouandjinou" />
              </div>
              <div>
                <Label><span className="inline-flex items-center gap-1.5"><Phone size={13} /> Téléphone (optionnel)</span></Label>
                <Input value={proj.ref} onChange={(e) => set('ref', e.target.value)}
                  placeholder="Ex. : +229 97 00 00 00" />
              </div>
              <div>
                <Label><span className="inline-flex items-center gap-1.5"><Home size={13} /> Type de projet</span></Label>
                <Select value={proj.entreprise} onChange={(e) => set('entreprise', e.target.value)}>
                  <option value="">— Sélectionnez votre type de projet —</option>
                  {TYPE_PROJET.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label><span className="inline-flex items-center gap-1.5"><FileText size={13} /> Description courte (optionnel)</span></Label>
                <Input value={proj.titre} onChange={(e) => set('titre', e.target.value)}
                  placeholder="Ex. : Ma future maison familiale à Cotonou" />
              </div>
            </>
          )}

          <div>
            <Label>Ville / localisation du chantier</Label>
            <Select value={proj.ville} onChange={(e) => set('ville', e.target.value)}>
              <option value="">— Sélectionnez votre ville —</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
              <option value="Autre">Autre (hors liste)</option>
            </Select>
            {!proj.ville && (
              <p className="text-[12px] text-lagune-deep mt-1.5 flex items-center gap-1.5">
                <ArrowDown size={13} /> Choisissez une ville pour débloquer la fondation recommandée.
              </p>
            )}
          </div>
        </Card>

        {/* ── 3. Fondation : débloquée APRÈS le choix de la ville ── */}
        {zone ? (
          <Card className="p-5 animate-fade-up" accent="laterite">
            <SectionTitle accent="laterite">
              <span className="inline-flex items-center gap-2">
                <MapPin size={17} className="text-laterite" /> Fondation recommandée — {proj.ville}
              </span>
            </SectionTitle>
            <div className="grid gap-3 text-[13.5px]">
              {[
                ['Zone', zone.label],
                ['Sol', zone.sol],
                ['Type de fondation', zone.fondation],
                ['Profondeur minimale', zone.profondeur],
                ['Dosage béton', zone.dosage],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="font-semibold text-muted text-[12px] uppercase tracking-wide">{k}</span>
                  <p className="mt-0.5">{v}</p>
                </div>
              ))}
              {zone.alerte && (
                <div className="bg-soleil-soft border border-soleil/30 rounded-[10px] px-3.5 py-2.5 text-soleil-deep text-[13px] flex gap-2">
                  <span aria-hidden>⚠</span><span>{zone.alerte}</span>
                </div>
              )}

              {/* ── Lot A : contrainte admissible éditable + recommandation ── */}
              {reco?.recommandation && (
                <div className="rounded-xl2 border border-indigo/20 bg-indigo-soft/40 px-3.5 py-3 grid gap-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[12px] uppercase tracking-wide text-indigo">
                    <Layers size={13} /> Recommandation géotechnique (Lot A)
                  </span>

                  <div>
                    <Label className="mb-1">
                      Contrainte admissible du sol (bar)
                      {reco.contrainte.source === 'zone' && (
                        <span className="ml-1.5 font-normal normal-case text-muted">— valeur par défaut de la zone, modifiable</span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.05" min="0" className="max-w-[140px]"
                        value={params.fondation?.contrainteAdmissible ?? ''}
                        placeholder={String(reco.contrainte.valeur)}
                        onChange={(e) => setFondation('contrainteAdmissible', e.target.value === '' ? null : +e.target.value)}
                      />
                      <Badge variant={reco.recommandation.classification === 'faible' ? 'lat' : reco.recommandation.classification === 'moyenne' ? 'sol' : 'ok'}>
                        Portance {reco.recommandation.classification}
                      </Badge>
                    </div>
                    {zone.contrainteAdmissible && (
                      <Hint>Fourchette indicative de la zone : {zone.contrainteAdmissible.min}–{zone.contrainteAdmissible.max} bar.</Hint>
                    )}
                  </div>

                  <div>
                    <span className="font-semibold text-muted text-[12px] uppercase tracking-wide">Fondation recommandée</span>
                    <p className="mt-0.5">{reco.recommandation.justification}</p>
                  </div>

                  {reco.horsPerimetre && (
                    <div className="bg-laterite-soft border border-laterite/30 rounded-[10px] px-3.5 py-2.5 text-laterite-deep text-[13px] flex gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>Portance faible sur un bâtiment de plus de R+2 : hors périmètre de calcul automatique — des fondations profondes (pieux) sont probablement nécessaires. Cas à faire étudier par un bureau de sol.</span>
                    </div>
                  )}

                  {reco.basFondPossible && (
                    <p className="text-[12px] text-muted">
                      Si le site est localisé en bas-fond ou vallée, la contrainte admissible réelle peut être bien inférieure à la valeur par défaut ci-dessus — ajustez-la si besoin.
                    </p>
                  )}
                </div>
              )}

              <p className="text-[12px] text-muted border-t border-line pt-3 mt-1">
                {FONDATIONS.avertissement}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-5 grid place-items-center text-center min-h-[220px]">
            <div className="max-w-[300px]">
              <div className="w-14 h-14 mx-auto rounded-2xl grid place-items-center bg-muted-bg text-muted mb-3">
                <Lock size={24} />
              </div>
              <h3 className="font-display font-semibold text-[15px]">Fondation verrouillée</h3>
              <p className="text-muted text-[13px] mt-1.5">
                {isPro
                  ? <>Indiquez d'abord la <b className="text-ink">ville du chantier</b> ci-contre : la fondation conseillée (type, profondeur, dosage) selon la zone géotechnique s'affichera ici.</>
                  : <>Indiquez d'abord la <b className="text-ink">ville de votre terrain</b> ci-contre : le type de fondation adapté à votre sol s'affichera ici automatiquement.</>
                }
              </p>
              <Badge variant="lag" className="mt-3"><MapPin size={12} /> En attente de localisation</Badge>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
