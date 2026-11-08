// Hypothèses et paramètres réellement utilisés par le calcul (visibles, jamais implicites).
import React from 'react'
import { Card, SectionTitle } from '../ui/index.jsx'

export default function HypothesesPanel({ totaux }) {
  const h = totaux?.hypotheses || []
  const c = totaux?.ciment
  return (
    <Card className="p-5">
      <SectionTitle>Hypothèses et paramètres</SectionTitle>
      <div className="overflow-x-auto"><table className="w-full text-[13px]"><tbody>
        {h.map((x) => (
          <tr key={x.cle} className="border-b border-line/60 align-top">
            <td className="py-2 pr-4 font-semibold w-[220px]">{x.lib}</td>
            <td className="py-2 text-[12.5px]">{x.valeur} <span className="text-muted text-[11px]">({x.statut})</span></td>
          </tr>
        ))}
      </tbody></table></div>
      {c && (
        <div className="mt-4 rounded-xl2 bg-muted-bg/60 border border-line p-3 text-[12.5px]">
          <p className="font-semibold mb-1">Ciment total ≈ {totaux.cimentSacs} sacs de 50 kg, ventilé par usage</p>
          <p>Béton : <b>{c.beton}</b> · Mortier de pose / joints : <b>{c.mortierPose}</b> · Enduits : <b>{c.enduits}</b> · Autres ouvrages (banché, moellons) : <b>{c.autres}</b></p>
        </div>
      )}
    </Card>
  )
}
