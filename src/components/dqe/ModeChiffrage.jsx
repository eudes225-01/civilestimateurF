// Sélecteur du mode de chiffrage : prix composés ou décomposés (jamais les deux : pas de double comptage).
import React from 'react'
import { MODES_CHIFFRAGE } from '../../lib/metre.js'

const AIDE = {
  compose: "Chaque ouvrage en béton armé est facturé à son prix composé complet (béton + acier + coffrage + main-d'œuvre). Acier, coffrage, ciment et granulats restent visibles (« inclus ») mais ne sont pas refacturés.",
  decompose: "Béton (mise en œuvre), ciment, granulats, acier et coffrage sont chiffrés séparément ; le prix global du béton armé n'est plus facturé. Maçonnerie, corps creux, enduits et couverture restent à leur prix composé.",
}

export default function ModeChiffrage({ params, setParams }) {
  const mode = MODES_CHIFFRAGE[params.modeChiffrage] ? params.modeChiffrage : 'compose'
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2">Mode de chiffrage du DQE</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {Object.entries(MODES_CHIFFRAGE).map(([k, m]) => {
          const on = mode === k
          return (
            <button key={k} type="button" onClick={() => setParams({ ...params, modeChiffrage: k })}
              className={`text-left rounded-[11px] border-2 px-3 py-2.5 transition-all ${on ? 'border-indigo bg-indigo-soft shadow-soft' : 'border-line bg-card hover:border-indigo/50'}`}>
              <span className={`block text-[12.5px] font-semibold ${on ? 'text-indigo-deep' : 'text-ink'}`}>{k === 'compose' ? 'Prix composés' : 'Prix décomposés'}</span>
              <span className="block text-[11.5px] text-muted mt-0.5">{AIDE[k]}</span>
              <span className="sr-only">{m.lab}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
