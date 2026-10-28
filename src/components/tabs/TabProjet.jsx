// src/components/tabs/TabProjet.jsx
import { FileText, PenLine } from 'lucide-react'
import React from 'react'
import { Card, Input, Label, SectionTitle } from '../ui/index.jsx'
import PlanAnalyzer from '../PlanAnalyzer.jsx'

export default function TabProjet({ proj, setProj, setLevels, setParams, couverture, depots, setDepots, premium = true, onPremium }) {
  const set = (k, v) => setProj({ ...proj, [k]: v })

  return (
    <div className="grid gap-5">
      {/* ── 1. Analyse de plan (fonction phare) ── */}
      <PlanAnalyzer proj={proj} setProj={setProj} setLevels={setLevels} setParams={setParams} couverture={couverture} depots={depots} setDepots={setDepots} premium={premium} onPremium={onPremium} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── 2. Informations du projet ── */}
        <Card className="p-5 grid gap-4" accent="indigo">
          <SectionTitle accent="indigo">Informations du projet</SectionTitle>

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

          <div>
            <Label>Ville / localisation du chantier</Label>
            <Input value={proj.ville} onChange={(e) => set('ville', e.target.value)}
              placeholder="Ex. : Quartier, ville, pays" />
          </div>
        </Card>

        {/* ── 3. Fondations : données saisies par l'utilisateur ou lues sur le plan ── */}
        <Card className="p-5" accent="laterite">
          <SectionTitle accent="laterite">Fondations : vos données</SectionTitle>
          <div className="grid gap-3.5 text-[13.5px]">
            <p className="text-muted">
              L'outil ne propose aucune fondation d'après la ville : le type, les profondeurs et les dimensions viennent de <b className="text-ink">votre étude et de votre plan de fondation</b>.
            </p>
            <div className="flex gap-3">
              <span className="shrink-0 w-8 h-8 rounded-[10px] grid place-items-center bg-laterite text-white"><FileText size={16} /></span>
              <p><b>Avec un plan de fondation</b> : déposez-le dans la case « Plan de fondation » ci-dessus (fonction Premium). Type, section des semelles, profondeur, longrines, chaînages, béton de propreté et prescriptions écrites sur le plan sont lus, puis vérifiables avant calcul.</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-8 h-8 rounded-[10px] grid place-items-center bg-indigo text-white"><PenLine size={16} /></span>
              <p><b>Sans plan</b> : saisissez tout dans l'onglet « Niveaux &amp; métré », rubrique Fondations (système, profondeurs, semelles, longrines, terrassement).</p>
            </div>
            <p className="text-[12px] text-muted border-t border-line pt-3">
              Un plan traduit des décisions de conception, il ne prouve pas la nature du sol. Le contrôle du fond de fouille avant bétonnage reste à la charge du professionnel responsable.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
