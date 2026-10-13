// src/components/PlanHelp.jsx
// Instructions affichées quand la lecture automatique échoue, ou en aide générale.
import React from 'react'
import { Lightbulb, ScanLine, Crop, Sun, Ruler, PencilLine } from 'lucide-react'

const TIPS = [
  { Ic: Ruler,     t: 'Plan coté', c: 'Vérifiez que les dimensions (cotes en m ou cm) ou l’échelle sont visibles et lisibles.' },
  { Ic: Sun,       t: 'Bon éclairage', c: 'Photographiez bien à plat, lumière uniforme, sans reflet ni ombre portée.' },
  { Ic: ScanLine,  t: 'Image nette', c: 'Privilégiez un PDF vectoriel ou une image ≥ 1500 px de large, bien contrastée.' },
  { Ic: Crop,      t: 'Un niveau à la fois', c: 'Cadrez un seul niveau et recadrez sur la zone des pièces ; redressez si l’image est inclinée.' },
  { Ic: PencilLine,t: 'Saisie manuelle', c: 'Si le plan reste illisible, renseignez les pièces à la main (longueur, largeur, hauteur, portes, fenêtres).' },
]

export default function PlanHelp({ compact = false }) {
  return (
    <div className={`rounded-xl2 border border-soleil/30 bg-soleil-soft/60 ${compact ? 'p-3.5' : 'p-4'}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Lightbulb size={16} className="text-soleil-deep" />
        <b className="text-[13px] text-soleil-deep">Comment obtenir une lecture fiable</b>
      </div>
      <ul className="grid sm:grid-cols-2 gap-2">
        {TIPS.map(({ Ic, t, c }) => (
          <li key={t} className="flex gap-2.5 text-[12.5px] leading-snug">
            <Ic size={15} className="shrink-0 mt-0.5 text-soleil-deep" />
            <span><b className="text-ink">{t}.</b> <span className="text-muted">{c}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
