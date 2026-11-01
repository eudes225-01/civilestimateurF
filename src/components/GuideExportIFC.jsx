// src/components/GuideExportIFC.jsx
// Guide d'export IFC précis, affiché quand la maquette déposée n'a pas pu être lue.
// Le contenu (étapes, vérification) vient du moteur (lireIFC → `guide`) : un seul endroit à maintenir.
import React, { useState } from 'react'
import { Boxes, ChevronDown } from 'lucide-react'

export default function GuideExportIFC({ guide, ouvert = false }) {
  const [open, setOpen] = useState(ouvert)
  if (!guide?.etapes?.length) return null
  return (
    <div className="rounded-xl2 border border-line bg-card px-3.5 py-3" data-testid="guide-export-ifc">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2 text-left text-[13px] font-semibold text-ink">
        <Boxes size={15} className="shrink-0 text-jade-deep" />
        <span className="flex-1">{guide.titre || 'Comment exporter un IFC lisible'}</span>
        <ChevronDown size={15} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2.5">
          <ol className="list-decimal pl-5 grid gap-1.5 text-[12.5px] text-ink leading-snug">
            {guide.etapes.map((e, i) => <li key={i}>{e}</li>)}
          </ol>
          {guide.verification && <p className="mt-2.5 text-[12px] text-muted leading-snug">{guide.verification}</p>}
        </div>
      )}
    </div>
  )
}
