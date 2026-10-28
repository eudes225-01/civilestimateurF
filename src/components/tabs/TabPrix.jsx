// src/components/tabs/TabPrix.jsx
import React, { useState } from 'react'
import { HardHat, Search, Info, RotateCcw } from 'lucide-react'
import { Card, Input, SectionTitle, Badge } from '../ui/index.jsx'
import { fmtNum, fmtMois } from '../../lib/format.js'
import { estEstime, estModifie, prixParDefaut, coeffK, KDEFAUT } from '../../lib/prixEstimes.js'

export default function TabPrix({ prix, setPrix, prixInfo, params, setParams }) {
  const [search, setSearch] = useState('')

  const update = (i, val) => {
    const n = [...prix]
    n[i] = { ...n[i], pu: parseFloat(val) || 0 }
    setPrix(n)
  }

  const reinit = (i) => { const n = [...prix]; n[i] = { ...n[i], pu: prixParDefaut(n[i]) }; setPrix(n) }
  const K = coeffK(params?.K)
  const nbEstimes = prix.filter(estEstime).length

  const filtered = prix.filter(
    (p) =>
      p.designation.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid gap-5">
      <Card className="p-5" accent="soleil">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <SectionTitle accent="soleil" className="mb-0">Base de prix — {prixInfo?.version || 'RPR'}{prixInfo?.date ? ` (${fmtMois(prixInfo.date)})` : ''}</SectionTitle>
          <Badge variant="ind"><HardHat size={13} /> Édition activée — Professionnel</Badge>
        </div>

        <p className="text-[13px] text-muted mb-4">
          Chaque poste a un prix moyen par défaut : modifiez-le selon vos fournisseurs et la réalité de votre terrain.
          Saisissez le <strong>prix de base (déboursé sec)</strong> : le coefficient K ci-dessous est ajouté automatiquement
          pour obtenir le prix de vente du DQE.
        </p>

        {/* Coefficient K : modifiable ici, là où l'on règle les prix */}
        <div className="rounded-xl border border-line bg-soleil-soft/40 p-3 mb-4 flex flex-wrap items-center gap-3">
          <label className="font-bold text-[13px]" htmlFor="coeff-k">Coefficient K</label>
          <Input
            id="coeff-k"
            type="number"
            min="1"
            max="3"
            step="0.01"
            value={params?.K ?? ''}
            onChange={(e) => setParams({ ...params, K: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            className="text-right w-[100px]"
          />
          <button
            type="button"
            onClick={() => setParams({ ...params, K: KDEFAUT })}
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"
            title="Revenir à K = 1,30"
          >
            <RotateCcw size={12} /> 1,30
          </button>
          <span className="text-[12px] text-muted">
            Prix de vente = prix de base × K (aléas, frais généraux, bénéfice) → <strong>+{fmtNum((K - 1) * 100, 0)} %</strong>
            {Number(params?.K) < 1 && params?.K !== '' ? ' — attention : K < 1 vend sous le prix de base.' : ''}
            {(params?.K === '' || !(Number(params?.K) > 0)) ? ` — champ vide : K = ${String(KDEFAUT).replace('.', ',')} appliqué.` : ''}
          </span>
        </div>

        {nbEstimes > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-soleil/30 bg-soleil-soft/60 text-soleil-deep p-3 mb-4 text-[12.5px]">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>{nbEstimes} prix</strong> sont des moyennes estimées (badge « Estimé »), pas des prix du barème RPR.
              Ajustez-les selon vos fournisseurs : ils passent en « Modifié » dès que vous les changez.
            </span>
          </div>
        )}

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <Input
            placeholder="Rechercher un poste (désignation ou code)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-[13px] min-w-[680px]">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide">
                <th className="text-left py-2 pr-3 font-bold">Code</th>
                <th className="text-left py-2 pr-3 font-bold">Désignation</th>
                <th className="text-center py-2 pr-3 font-bold">U</th>
                <th className="text-right py-2 pr-3 font-bold">Prix par défaut</th>
                <th className="text-right py-2 pr-3 font-bold w-[140px]">Votre prix de base (FCFA)</th>
                <th className="text-right py-2 font-bold">Prix de vente (× K)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const origIdx = prix.indexOf(p)
                return (
                  <tr key={p.code} className="border-t border-line/70 hover:bg-soleil-soft/40 transition-colors">
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted">{p.code}</td>
                    <td className="py-2 pr-3">
                      {p.designation}
                      {estEstime(p) && <span className="ml-2 text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-soleil-soft text-soleil-deep border border-soleil/30">Estimé</span>}
                      {estModifie(p) && <span className="ml-2 text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-lagune-soft text-lagune-deep border border-lagune/25">Modifié</span>}
                    </td>
                    <td className="py-2 pr-3 text-center text-muted">{p.unite}</td>
                    <td className="py-2 pr-3 text-right text-muted">{fmtNum(prixParDefaut(p), 0)}</td>
                    <td className="py-2 pr-3 text-right">
                      <Input
                          type="number"
                          min="0"
                          step="100"
                          value={p.pu}
                          onChange={(e) => update(origIdx, e.target.value)}
                          className="text-right w-[120px] ml-auto"
                        />
                      {estModifie(p) && (
                        <button type="button" onClick={() => reinit(origIdx)} className="mt-0.5 text-[10.5px] text-muted hover:text-ink inline-flex items-center gap-1">
                          <RotateCcw size={10} /> Prix par défaut
                        </button>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-muted">{fmtNum(Math.round((p.pu || 0) * K), 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-muted py-8 text-[13px]">Aucun poste correspondant.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
