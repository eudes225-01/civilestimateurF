// Quantités de matériaux (liste de commande) — distincte du DQE financier, toujours disponible.
import React, { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Card, SectionTitle, Badge, Button } from '../ui/index.jsx'
import { fmtNum } from '../../lib/format.js'
import { materiauxEnCsv } from '../../lib/calcul.js'
import { telecharger } from '../../lib/pdfServeur.js'

const STATUT = {
  calcule: { lab: 'calculé', cls: 'bg-jade-soft text-jade-deep' },
  estime: { lab: 'estimé', cls: 'bg-soleil-soft text-soleil-deep' },
  a_confirmer: { lab: 'à confirmer', cls: 'bg-laterite-soft text-laterite-deep' },
}
const Pastille = ({ s }) => <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUT[s]?.cls || ''}`}>{STATUT[s]?.lab || s}</span>

export default function MateriauxPanel({ materiaux }) {
  const [detail, setDetail] = useState(false)
  const [filtre, setFiltre] = useState('')
  const synthese = materiaux?.synthese || []
  const lignes = useMemo(() => (materiaux?.lignes || []).filter((l) => !filtre || `${l.designation} ${l.ouvrage} ${l.niveau}`.toLowerCase().includes(filtre.toLowerCase())), [materiaux, filtre])
  if (synthese.length === 0) {
    return <Card className="p-8 text-center text-muted text-[13.5px]">Aucun matériau à lister : saisissez des dimensions dans « Niveaux &amp; métré ».</Card>
  }
  const exporter = () => telecharger(new Blob([materiauxEnCsv(materiaux)], { type: 'text/csv;charset=utf-8' }), 'quantites-materiaux.csv')
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <SectionTitle className="mb-0">Quantités de matériaux</SectionTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDetail((d) => !d)}>{detail ? 'Voir la synthèse' : 'Voir le détail par ouvrage'}</Button>
          <Button variant="accent" size="sm" onClick={exporter}><Download size={13} /> Exporter CSV</Button>
        </div>
      </div>
      <p className="text-[12.5px] text-muted mb-3">
        Besoins chantier, indépendants du mode de chiffrage : blocs pertes incluses, ciment distingué (béton / mortier de pose / enduits / autres),
        sable, gravier, acier, entrevous, poutrelles, coffrage. L'acier est une <b>estimation par ratios</b>, pas un ferraillage détaillé.
      </p>
      {detail && <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Filtrer (ouvrage, niveau, matériau…)" className="mb-3 w-full sm:w-72 rounded-[9px] border border-line px-2.5 py-1.5 text-[12.5px]" />}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-line text-muted text-[11.5px] uppercase tracking-wide">
            <th className="text-left py-2 pr-3 font-semibold">Matériau</th>
            <th className="text-right py-2 pr-3 font-semibold">Quantité</th>
            <th className="text-center py-2 pr-3 font-semibold">Unité</th>
            {!detail && <th className="text-right py-2 pr-3 font-semibold">À commander</th>}
            {detail && <th className="text-left py-2 pr-3 font-semibold">Ouvrage / niveau / formule</th>}
            <th className="text-center py-2 font-semibold">Statut</th>
          </tr></thead>
          <tbody>
            {!detail && synthese.map((m) => (
              <tr key={m.code} className="border-b border-line/60 hover:bg-muted-bg/50">
                <td className="py-2 pr-3">{m.designation}<span className="block text-[11px] text-muted">{(m.ouvrages || []).slice(0, 3).join(' · ')}{(m.ouvrages || []).length > 3 ? ' …' : ''}</span></td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(m.quantite, 2)}</td>
                <td className="py-2 pr-3 text-center text-muted">{m.unite}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums font-semibold">{fmtNum(m.quantiteCommande, ['m³', 'm²', 'ml'].includes(m.unite) ? 2 : 0)}</td>
                <td className="py-2 text-center"><Pastille s={m.statut} /></td>
              </tr>
            ))}
            {detail && lignes.map((l, i) => (
              <tr key={i} className="border-b border-line/60 hover:bg-muted-bg/50">
                <td className="py-2 pr-3">{l.designation}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(l.quantite, 2)}</td>
                <td className="py-2 pr-3 text-center text-muted">{l.unite}</td>
                <td className="py-2 pr-3 text-[12px]"><b>{l.ouvrage}</b> — {l.niveau}<span className="block text-muted font-mono text-[10.5px]">{l.formule}</span></td>
                <td className="py-2 text-center"><Pastille s={l.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] text-muted">
        <Badge variant="ind">{synthese.length} matériaux</Badge><span>« calculé » : géométrie directe · « estimé » : ratio ou dosage · « à confirmer » : donnée absente ou par défaut</span>
      </div>
    </Card>
  )
}
