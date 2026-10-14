// src/components/tabs/TabPrix.jsx
import React, { useState } from 'react'
import { Lock, HardHat, Search } from 'lucide-react'
import { Card, Input, SectionTitle, Badge } from '../ui/index.jsx'
import { fmtNum } from '../../lib/format.js'

export default function TabPrix({ prix, setPrix, isPro }) {
  const [search, setSearch] = useState('')

  const update = (i, val) => {
    if (!isPro) return
    const n = [...prix]
    n[i] = { ...n[i], pu: parseFloat(val) || 0 }
    setPrix(n)
  }

  const filtered = prix.filter(
    (p) =>
      p.designation.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid gap-5">
      <Card className="p-5" accent={isPro ? 'soleil' : 'laterite'}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <SectionTitle accent="soleil" className="mb-0">Base de prix — RPR 26.2</SectionTitle>
          {isPro ? (
            <Badge variant="ind"><HardHat size={13} /> Édition activée — Professionnel</Badge>
          ) : (
            <Badge variant="lat"><Lock size={13} /> Lecture seule — Particulier</Badge>
          )}
        </div>

        {isPro ? (
          <p className="text-[13px] text-muted mb-4">
            Prix unitaires HT ajustables selon vos fournisseurs et vos réalités de terrain.
            Le coefficient K (onglet Niveaux) majore les prix dans le DQE.
          </p>
        ) : (
          <div className="mb-4 mt-2 rounded-xl2 bg-laterite-soft border border-laterite/20 px-3.5 py-3 flex gap-2.5 text-[13px] text-laterite-deep">
            <Lock size={16} className="shrink-0 mt-0.5" />
            <span>
              En mode <b>Particulier</b>, les prix de référence sont affichés à titre indicatif mais
              <b> non modifiables</b>. Pour ajuster chaque prix unitaire, revenez à l'accueil et choisissez
              le profil <b>Professionnel du génie civil</b>.
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
          <table className="w-full text-[13px] min-w-[560px]">
            <thead>
              <tr className="text-muted text-[11px] uppercase tracking-wide">
                <th className="text-left py-2 pr-3 font-bold">Code</th>
                <th className="text-left py-2 pr-3 font-bold">Désignation</th>
                <th className="text-center py-2 pr-3 font-bold">U</th>
                <th className="text-right py-2 pr-3 font-bold">PU RPR</th>
                <th className="text-right py-2 font-bold w-[140px]">{isPro ? 'Votre PU (FCFA)' : 'PU retenu'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const origIdx = prix.indexOf(p)
                return (
                  <tr key={p.code} className="border-t border-line/70 hover:bg-soleil-soft/40 transition-colors">
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted">{p.code}</td>
                    <td className="py-2 pr-3">{p.designation}</td>
                    <td className="py-2 pr-3 text-center text-muted">{p.unite}</td>
                    <td className="py-2 pr-3 text-right text-muted">{fmtNum(p.bi, 0)}</td>
                    <td className="py-2 text-right">
                      {isPro ? (
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={p.pu}
                          onChange={(e) => update(origIdx, e.target.value)}
                          className="text-right w-[120px] ml-auto"
                        />
                      ) : (
                        <span className="inline-flex items-center justify-end gap-1.5 w-[120px] ml-auto px-3 py-2 rounded-[10px] bg-muted-bg border border-line text-ink font-semibold">
                          <Lock size={11} className="text-muted" />
                          {fmtNum(p.pu, 0)}
                        </span>
                      )}
                    </td>
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
