// src/components/tabs/TabDQE.jsx
// DQE v2 : bandeau de périmètre (B2), encadré « Points à vérifier » (A7),
// et détail du métré dépliable par ligne — chaque total se justifie
// élément par élément (A9).
import React, { useMemo, useState } from 'react'
import { AlertTriangle, AlertOctagon, Info, ChevronDown, ListTree } from 'lucide-react'
import { Card, SectionTitle, Badge } from '../ui/index.jsx'
import { buildDQE } from '../../lib/metre.js'
import { buildSousDetail } from '../../lib/metre.js'
import { fmtCFA, fmtNum } from '../../lib/format.js'

const ALERTE_STYLE = {
  bloquante: { Icon: AlertOctagon, cls: 'bg-laterite-soft border-laterite/30 text-laterite-deep' },
  attention: { Icon: AlertTriangle, cls: 'bg-soleil-soft border-soleil/30 text-soleil-deep' },
  info:      { Icon: Info,          cls: 'bg-lagune-soft border-lagune/25 text-lagune-deep' },
}

export default function TabDQE({ totaux, prix, params, alertes = [], prixInfo }) {
  const [ouverts, setOuverts] = useState({})
  const prixMap = useMemo(() => Object.fromEntries(prix.map((p) => [p.code, p.pu])), [prix])
  const dqe = useMemo(() => buildDQE(totaux, prixMap, params.K || 1.3), [totaux, prixMap, params.K])
  const sousDetail = useMemo(() => buildSousDetail(dqe.lignes, prixMap, params.K || 1.3), [dqe.lignes, prixMap, params.K])

  if (!dqe.lignes || dqe.lignes.length === 0) {
    return (
      <Card className="p-8 text-center text-muted text-[13.5px]">
        Saisissez des dimensions dans l'onglet <b>Niveaux & métré</b> pour générer le DQE.
      </Card>
    )
  }

  const bloquantes = alertes.filter((a) => a.niveau === 'bloquante')

  return (
    <div className="grid gap-5">
      {/* ── Points à vérifier (A7) ── */}
      {alertes.length > 0 && (
        <Card className="p-5" accent="soleil">
          <div className="flex items-center justify-between gap-3 mb-3">
            <SectionTitle accent="soleil" className="mb-0">Points à vérifier avant de transmettre</SectionTitle>
            <Badge variant="lat">{alertes.length} alerte(s)</Badge>
          </div>
          <div className="grid gap-2">
            {alertes.map((a, i) => {
              const { Icon, cls } = ALERTE_STYLE[a.niveau] || ALERTE_STYLE.info
              return (
                <div key={i} className={`rounded-xl2 border px-3.5 py-2.5 flex gap-2.5 text-[13px] ${cls}`}>
                  <Icon size={16} className="shrink-0 mt-0.5" />
                  <span><b className="uppercase text-[10.5px] tracking-wide mr-1.5">{a.niveau}</b>{a.msg}</span>
                </div>
              )
            })}
          </div>
          {bloquantes.length > 0 && (
            <p className="text-[12.5px] text-laterite-deep font-semibold mt-3">
              {bloquantes.length} alerte(s) bloquante(s) : corrigez-les dans « Niveaux & métré » avant d'exporter le devis.
            </p>
          )}
        </Card>
      )}

      {/* ── Postes métrés mais sans prix : le total est incomplet ── */}
      {dqe.sansPrix?.length > 0 && (
        <div className="rounded-xl2 border px-3.5 py-3 flex gap-2.5 text-[13px] bg-laterite-soft border-laterite/30 text-laterite-deep">
          <AlertOctagon size={16} className="shrink-0 mt-0.5" />
          <span>
            <b>Total incomplet :</b> {dqe.sansPrix.length} poste(s) métré(s) sans prix (0 FCFA) ne sont pas
            comptés dans le total — {dqe.sansPrix.map((l) => `${l.n} ${l.des}`).join(' · ')}.
            Renseignez-les dans l'onglet « Prix ».
          </span>
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <SectionTitle className="mb-0">Devis Quantitatif Estimatif</SectionTitle>
          <Badge variant="lat">K = {params.K}</Badge>
        </div>

        {/* ── Périmètre couvert (B2) ── */}
        <div className="rounded-xl2 bg-indigo-soft border border-indigo/20 px-3.5 py-2.5 text-[12.5px] text-indigo-deep mb-4">
          <b>Périmètre :</b> {dqe.perimetre}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-muted text-[11.5px] uppercase tracking-wide">
                <th className="text-left py-2 pr-3 font-semibold w-[50px]">N°</th>
                <th className="text-left py-2 pr-3 font-semibold">Désignation</th>
                <th className="text-center py-2 pr-3 font-semibold">U</th>
                <th className="text-right py-2 pr-3 font-semibold">Qté</th>
                <th className="text-right py-2 pr-3 font-semibold">PU (FCFA)</th>
                <th className="text-right py-2 font-semibold">Montant HT</th>
              </tr>
            </thead>
            <tbody>
              {dqe.lignes.map((l) => {
                const aDetail = Array.isArray(l.detail) && l.detail.length > 0
                const ouvert = !!ouverts[l.n]
                return (
                  <React.Fragment key={l.n}>
                    <tr className="border-b border-line/60 hover:bg-muted-bg/50">
                      <td className="py-2 pr-3 font-mono text-[11px] text-muted">{l.n}</td>
                      <td className="py-2 pr-3">
                        {aDetail ? (
                          <button
                            onClick={() => setOuverts((o) => ({ ...o, [l.n]: !o[l.n] }))}
                            className="inline-flex items-center gap-1.5 text-left hover:text-indigo transition-colors"
                            title="Voir le détail du métré (justification des quantités)"
                          >
                            <ListTree size={13} className="text-indigo shrink-0" />
                            {l.des}
                            <ChevronDown size={12} className={`text-muted transition-transform ${ouvert ? 'rotate-180' : ''}`} />
                          </button>
                        ) : l.des}
                      </td>
                      <td className="py-2 pr-3 text-center text-muted">{l.u}</td>
                      <td className="py-2 pr-3 text-right">{fmtNum(l.q, 2)}</td>
                      <td className="py-2 pr-3 text-right">{fmtNum(l.pu, 0)}</td>
                      <td className="py-2 text-right font-semibold">{fmtNum(l.montant, 0)}</td>
                    </tr>
                    {aDetail && ouvert && (
                      <tr className="border-b border-line/60 bg-muted-bg/40">
                        <td />
                        <td colSpan={5} className="py-2 pr-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-1.5">
                            Justification des quantités — {l.detail.length} élément(s)
                          </p>
                          <div className="grid sm:grid-cols-2 gap-1">
                            {l.detail.map((d, i) => (
                              <div key={i} className="flex justify-between gap-3 text-[12px] bg-card border border-line rounded-[7px] px-2.5 py-1.5">
                                <span className="min-w-0">
                                  <span className="font-medium">{d.lib}</span>
                                  {d.formule && <span className="text-muted font-mono text-[10.5px] block">{d.formule}</span>}
                                </span>
                                <span className="font-mono tabular-nums shrink-0">{fmtNum(d.q, 2)} {d.u}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="mt-5 border-t border-line pt-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-indigo-soft rounded-[12px] px-4 py-3 text-center">
              <p className="text-[11.5px] text-indigo uppercase tracking-wide font-semibold">Total HT</p>
              <p className="font-bold text-[16px] mt-1 font-mono tabular-nums text-indigo-deep">{fmtCFA(dqe.ht)}</p>
            </div>
            <div className="bg-soleil-soft rounded-[12px] px-4 py-3 text-center">
              <p className="text-[11.5px] text-soleil-deep uppercase tracking-wide font-semibold">TVA 18 %</p>
              <p className="font-bold text-[16px] mt-1 font-mono tabular-nums text-soleil-deep">{fmtCFA(dqe.tva)}</p>
            </div>
            <div className="rounded-[12px] px-4 py-3 text-center text-white bg-gradient-to-br from-indigo to-laterite shadow-glow">
              <p className="text-[11.5px] opacity-80 uppercase tracking-wide">Total TTC — gros œuvre</p>
              <p className="font-bold text-[18px] mt-1 font-mono tabular-nums">{fmtCFA(dqe.ttc)}</p>
            </div>
          </div>
          <p className="text-[12px] text-muted mt-3">
            Prix unitaires majorés par K = {params.K} (aléas + frais généraux + bénéfice). Base {prixInfo?.version || 'RPR'}.
            <b> Total gros œuvre uniquement, hors second œuvre.</b> Estimation indicative : ne remplace pas
            un métré d'exécution ni les prix réels du marché.
          </p>
        </div>
      </Card>

      {/* ── Sous-détail des prix unitaires ── */}
      <Card className="p-5" accent="indigo">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <SectionTitle accent="indigo" className="mb-0">Sous-détail des prix unitaires</SectionTitle>
          <Badge variant="ind">Déboursé sec × K = {params.K}</Badge>
        </div>
        <p className="text-[13px] text-muted mb-4">
          Décomposition de chaque prix unitaire en matériaux, main d'œuvre et matériel/frais
          divers, avant application du coefficient de majoration K (aléas, frais généraux, bénéfice).
        </p>

        <div className="grid gap-4">
          {sousDetail.map((sd) => (
            <div key={sd.n} className="border border-line rounded-xl2 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted-bg border-b border-line flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">
                  <span className="font-mono text-muted text-[11px] mr-1.5">{sd.n}</span>
                  {sd.des} <span className="text-muted font-normal">({sd.u})</span>
                </span>
                <Badge variant="lat">PU vente : {fmtCFA(sd.puVente)} / {sd.u}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] min-w-[480px]">
                  <thead>
                    <tr className="text-muted text-[11px] uppercase tracking-wide">
                      <th className="text-left py-2 pl-4 pr-2 font-semibold">Composante</th>
                      <th className="text-right py-2 pr-2 font-semibold">Montant (FCFA)</th>
                      <th className="text-right py-2 pr-4 font-semibold">% du déboursé sec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sd.composantes.map((c) => (
                      <tr key={c.lib} className="border-t border-line/60">
                        <td className="py-1.5 pl-4 pr-2">{c.lib}</td>
                        <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{fmtNum(c.montant, 0)}</td>
                        <td className="py-1.5 pr-4 text-right text-muted">
                          {sd.deboursesSec > 0 ? fmtNum((c.montant / sd.deboursesSec) * 100, 1) : '0,0'} %
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-line bg-muted-bg/60 font-semibold">
                      <td className="py-1.5 pl-4 pr-2">Déboursé sec</td>
                      <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{fmtNum(sd.deboursesSec, 0)}</td>
                      <td className="py-1.5 pr-4 text-right text-muted">100 %</td>
                    </tr>
                    <tr className="border-t border-line/60">
                      <td className="py-1.5 pl-4 pr-2 text-muted">Majoration (K = {sd.coeffK})</td>
                      <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-muted">+ {fmtNum(sd.majoration, 0)}</td>
                      <td className="py-1.5 pr-4 text-right text-muted">—</td>
                    </tr>
                    <tr className="border-t border-line bg-soleil-soft font-semibold">
                      <td className="py-1.5 pl-4 pr-2 text-soleil-deep">Prix de vente unitaire</td>
                      <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-soleil-deep">{fmtNum(sd.puVente, 0)}</td>
                      <td className="py-1.5 pr-4 text-right text-muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted mt-4">
          Les clés de répartition matériaux / main d'œuvre / matériel sont des moyennes de marché
          indicatives. Un bureau d'études peut les ajuster selon ses propres bordereaux.
        </p>
      </Card>
    </div>
  )
}
