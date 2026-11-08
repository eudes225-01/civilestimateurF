// Métré détaillé : murs par catégorie (soubassement séparé), fondations par ouvrage, terrassement, planchers, toiture.
// Aucune formule ici : tout est lu dans `totaux` produit par le moteur partagé.
import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, SectionTitle, Badge } from '../ui/index.jsx'
import { fmtNum } from '../../lib/format.js'

const N = (v, d = 2) => fmtNum(v ?? 0, d)
const Th = ({ children, r }) => <th className={`py-1.5 pr-3 font-semibold ${r ? 'text-right' : 'text-left'}`}>{children}</th>
const Td = ({ children, r, b }) => <td className={`py-1.5 pr-3 ${r ? 'text-right font-mono tabular-nums' : ''} ${b ? 'font-semibold' : ''}`}>{children}</td>
const Tbl = ({ head, children }) => (
  <div className="overflow-x-auto"><table className="w-full text-[12.5px] min-w-[620px]">
    <thead><tr className="border-b border-line text-muted text-[11px] uppercase tracking-wide">{head}</tr></thead>
    <tbody>{children}</tbody></table></div>
)
const MODES_TERR = { reemploi: 'Réemploi des terres excavées', evacuation: 'Évacuation totale (sans réemploi)', purge: 'Purge de sol impropre (évacuation + apport extérieur)' }

export default function MetreDetaille({ totaux }) {
  const cats = Object.values(totaux?.parCategorieMur || {})
  const f = totaux?.fondation || {}
  const terr = f.terrassement
  const aCompleter = totaux?.soubassementACompleter || []
  const pl = (totaux?.planchers || []).filter((p) => p.typePlancher && p.typePlancher !== 'aucun')
  const tc = totaux?.toitureCalcul
  if (!cats.length && !(f.semellesFilantes?.length || f.semellesIsolees?.length || f.rigoles?.length || f.radier) && !pl.length) {
    return <Card className="p-8 text-center text-muted text-[13.5px]">Aucun métré à détailler : saisissez des dimensions dans « Niveaux &amp; métré ».</Card>
  }
  return (
    <div className="grid gap-5">
      {cats.length > 0 && (
        <Card className="p-5">
          <SectionTitle>Murs, cloisons et soubassements — par catégorie d'ouvrage</SectionTitle>
          {aCompleter.length > 0 && (
            <div className="rounded-xl2 border px-3.5 py-2.5 mb-3 flex gap-2 text-[12.5px] bg-soleil-soft border-soleil/30 text-soleil-deep">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span><b>Soubassement à compléter :</b> {aCompleter.map((x) => `${x.nom} (${x.manque.join(', ')})`).join(' · ')}. Ces murs ne sont pas comptés tant que leurs dimensions ne sont pas saisies.</span>
            </div>
          )}
          <Tbl head={<><Th>Catégorie</Th><Th r>Brute m²</Th><Th r>Ouvertures m²</Th><Th r>Nette m²</Th><Th r>L. dév. m</Th><Th r>Ép. m</Th><Th r>Blocs (pertes incl.)</Th><Th r>Mortier m³</Th><Th r>Ciment sacs</Th><Th r>Sable m³</Th><Th r>Enduit int./ext. m²</Th></>}>
            {cats.map((c) => (
              <tr key={c.categorie} className={`border-b border-line/60 ${c.categorie === 'soubassement' ? 'bg-muted-bg/50' : ''}`}>
                <Td b>{c.lab}</Td><Td r>{N(c.surfBrute)}</Td><Td r>{N(c.surfOuvertures)}</Td><Td r b>{N(c.surfNette)}</Td><Td r>{N(c.Ldev)}</Td>
                <Td r>{(c.epaisseurs || []).join(' / ')}</Td><Td r b>{N(c.blocs, 0)}</Td><Td r>{N(c.mortierM3)}</Td><Td r>{N(c.cimentSacs)}</Td><Td r>{N(c.sableM3)}</Td>
                <Td r>{c.categorie === 'soubassement' ? `hydrofuge ${N(c.enduitHydrofuge)}` : `${N(c.enduitInt)} / ${N(c.enduitExt)}`}</Td>
              </tr>
            ))}
          </Tbl>
          <p className="text-[11.5px] text-muted mt-2">Le soubassement est compté à part (jamais dans les murs d'élévation). La somme des blocs par catégorie peut différer de 1–2 unités du total « agglos » (arrondis par type de bloc).</p>
        </Card>
      )}

      {(f.semellesFilantes?.length > 0 || f.semellesIsolees?.length > 0 || f.rigoles?.length > 0 || f.radier) && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2"><SectionTitle className="mb-0">Fondations — détail par ouvrage</SectionTitle><Badge variant="lat">acier : estimation par ratio</Badge></div>
          <Tbl head={<><Th>Ouvrage</Th><Th>Dimensions</Th><Th r>Fouille m³</Th><Th r>Propreté m³</Th><Th r>Béton m³</Th><Th r>Acier kg (estimé)</Th><Th r>Remblai m³ *</Th><Th r>Déblais évac. m³ *</Th></>}>
            {f.semellesFilantes?.map((s, i) => (
              <tr key={`sf${i}`} className="border-b border-line/60"><Td b>{s.ref}</Td><Td>L {N(s.longueur)} × l {s.largeur} × h {s.hauteur} · fouille {s.profFouille} m</Td>
                <Td r>{N(s.volFouille)}</Td><Td r>{N(s.volProprete)}</Td><Td r>{N(s.volBA)} (+ chaînage {N(s.volChainageBas)})</Td><Td r>{N(s.acierKg, 0)}</Td><Td r>{N(s.remblaiIndicatif)}</Td><Td r>{N(s.deblaisEvacuesIndicatif)}</Td></tr>
            ))}
            {f.semellesIsolees?.map((s, i) => (
              <tr key={`si${i}`} className="border-b border-line/60"><Td b>{s.ref} × {s.nb}</Td><Td>fouille {s.fouille.L}×{s.fouille.l}×{s.fouille.prof} · béton {s.beton.L}×{s.beton.l}×{s.beton.h}</Td>
                <Td r>{N(s.volFouille)}</Td><Td r>{N(s.volProprete)}</Td><Td r>{N(s.volBA)}</Td><Td r>{N(s.acierKg, 0)}</Td><Td r>{N(s.remblaiIndicatif)}</Td><Td r>{N(s.deblaisEvacuesIndicatif)}</Td></tr>
            ))}
            {f.rigoles?.map((s, i) => (
              <tr key={`rg${i}`} className="border-b border-line/60"><Td b>{s.type} {s.ref}</Td><Td>{s.nb} × {s.L} m · rigole {s.bF}×{s.prof} · {s.b}×{s.h}</Td>
                <Td r>{N(s.volFouille)}</Td><Td r>{N(s.volProprete)}</Td><Td r>{N(s.volBA)}</Td><Td r>{N(s.acierKg, 0)}</Td><Td r>{N(s.remblaiIndicatif)}</Td><Td r>{N(s.deblaisEvacuesIndicatif)}</Td></tr>
            ))}
            {f.radier && (
              <tr className="border-b border-line/60"><Td b>{f.radier.ref}</Td><Td>{N(f.radier.surface)} m² · ép. {f.radier.epaisseur} · fouille {f.radier.profFouille} m</Td>
                <Td r>{N(f.radier.volFouille)}</Td><Td r>{N(f.radier.volProprete)}</Td><Td r>{N(f.radier.volBA)}</Td><Td r>{N(f.radier.acierKg, 0)}</Td><Td r>{N(f.radier.remblaiIndicatif)}</Td><Td r>—</Td></tr>
            )}
          </Tbl>
          <p className="text-[11.5px] text-muted mt-2">* Répartition indicative par ouvrage ; les totaux du terrassement ci-dessous font foi. L'acier est une estimation (ratio kg/m³), pas un plan de ferraillage.</p>
          {terr && (
            <div className="mt-4 rounded-xl2 bg-muted-bg/60 border border-line p-3 text-[12.5px]">
              <p className="font-semibold mb-1">Terrassement — {MODES_TERR[terr.mode] || terr.mode}</p>
              <p>Déblais en place : <b>{N(terr.vDeblaisPlace)}</b> m³ · Remblai compacté nécessaire : <b>{N(terr.vRemblai)}</b> m³ · Terres réemployées : <b>{N(terr.reemploi)}</b> m³ · Évacuation (foisonnée) : <b>{N(terr.evacuer)}</b> m³ · Apport extérieur : <b>{N(terr.apport)}</b> m³
                {terr.nonPourvu > 0 && <span className="text-laterite-deep font-semibold"> · Remblai non pourvu : {N(terr.nonPourvu)} m³</span>}</p>
            </div>
          )}
        </Card>
      )}

      {pl.length > 0 && (
        <Card className="p-5">
          <SectionTitle>Planchers</SectionTitle>
          <Tbl head={<><Th>Niveau</Th><Th>Type</Th><Th r>Surface m²</Th><Th r>Béton m³</Th><Th r>Entrevous</Th><Th r>Poutrelles (ml)</Th><Th r>Acier kg (estimé)</Th><Th r>Coffrage sous-face m²</Th><Th r>Rives m²</Th></>}>
            {pl.map((p, i) => (
              <tr key={i} className="border-b border-line/60"><Td b>{p.niveau}</Td><Td>{p.typePlancher}{p.hauteurCorpsCreux ? ` ${p.hauteurCorpsCreux}+5` : ''}{p.sousFace ? ` · sous-face ${p.sousFace}` : ''}{p.statut === 'a_confirmer' ? ' · à confirmer' : ''}</Td>
                <Td r>{N(p.surfNette)}</Td><Td r>{N(p.vol)}{p.volNervures > 0 ? ` (nerv. ${N(p.volNervures)} + table ${N(p.volTable)})` : ''}</Td>
                <Td r>{p.entrevous ? N(p.entrevous, 0) : '—'}</Td><Td r>{p.poutrellesL != null ? N(p.poutrellesL) : (p.hauteurCorpsCreux ? 'entraxe ?' : '—')}</Td>
                <Td r>{N(p.acier, 0)}</Td><Td r>{N(p.coffSousFace)}</Td><Td r>{N(p.coffRives)}</Td></tr>
            ))}
          </Tbl>
          <p className="text-[11.5px] text-muted mt-2">Dalle sur terre-plein : aucun coffrage de sous-face (seules les rives, si le périmètre est saisi).</p>
        </Card>
      )}

      {tc && (
        <Card className="p-5">
          <SectionTitle>Toiture et pignons</SectionTitle>
          <p className="text-[13px]">Surface de couverture : <b>{N(tc.surfCouverture)} m²</b> <span className="text-muted">({tc.methode})</span></p>
          <p className="text-[12px] text-muted font-mono mt-1">{tc.formule}</p>
          <p className="text-[12.5px] mt-2">{totaux.pignons?.inclus
            ? <>Pignons inclus au métré des murs : <b>{N(totaux.pignons.surfTriangles)} m²</b> (triangles sous toiture).</>
            : <span className="text-soleil-deep font-semibold">Pignons non inclus au métré des murs (aucun pignon saisi).</span>}</p>
        </Card>
      )}
    </div>
  )
}
