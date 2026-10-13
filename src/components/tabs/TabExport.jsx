// src/components/tabs/TabExport.jsx
import React, { useState, useRef } from 'react'
import { FileDown, Loader, Image as ImageIcon, X, Palette, BadgeCheck, MapPin, Phone, Mail } from 'lucide-react'
import { Card, Button, SectionTitle, Label, Input, Badge } from '../ui/index.jsx'
import { buildDQE } from '../../lib/metre.js'
import { buildSousDetail } from '../../lib/metre.js'
import { fmtCFA, fmtDate } from '../../lib/format.js'
import { pdfServeur, telecharger } from '../../lib/pdfServeur.js'
import { exportPdfLegacy } from '../../lib/pdfLegacy.js'

const PRESETS = ['#1e2a78', '#e0532f', '#0fa36b', '#17b3c7', '#7c3aed', '#0f172a']

export default function TabExport({ proj, totaux, prix, params, alertes = [], prixInfo }) {
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [opts, setOpts] = useState({ pageGarde: true, sousDetail: true, metresComplets: true, pagination: true })
  const [brand, setBrand] = useState({
    color: '#1e2a78',
    logo: null,
    logoName: '',
    slogan: 'Métré & Devis Quantitatif Estimatif',
    telephone: '',
    email: '',
    adresse: '',
    rccm: '',
    ifu: '',
  })
  const logoRef = useRef(null)

  const prixMap = Object.fromEntries(prix.map((p) => [p.code, p.pu]))
  const dqe = buildDQE(totaux, prixMap, params.K || 1.3)
  const sousDetail = buildSousDetail(dqe.lignes, prixMap, params.K || 1.3)

  const onLogo = (f) => {
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(f.type)) {
      alert('Logo : utilisez une image PNG ou JPG.'); return
    }
    const r = new FileReader()
    r.onload = () => setBrand((b) => ({ ...b, logo: String(r.result), logoName: f.name }))
    r.readAsDataURL(f)
  }

  const handleExport = async () => {
    setLoading(true)
    setInfo('')
    const ctx = { proj, totaux, params, alertes, prixInfo, brand, opts, dqe, sousDetail }
    const nom = `BPU_DQE_${(proj.titre || 'projet').replace(/[^\w\-]+/g, '_')}_${fmtDate(new Date()).replace(/\//g, '-')}.pdf`
    try {
      // 1) Rendu HTML/CSS côté serveur (qualité maximale).
      let blob = null
      try {
        blob = await pdfServeur(ctx)
      } catch (e) {
        console.warn('PDF serveur indisponible, bascule sur l\'export local :', e)
      }
      if (blob) {
        telecharger(blob, nom)
      } else {
        // 2) Secours : export local (jsPDF) — l'utilisateur n'est jamais bloqué.
        await exportPdfLegacy(ctx)
        setInfo('Le serveur de mise en page est momentanément indisponible : PDF généré en version simplifiée. Réessayez dans un instant pour la version complète.')
      }
    } catch (e) {
      console.error('Export PDF :', e)
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── Personnalisation du document ── */}
      <Card className="p-5" accent={'indigo'}>
        <SectionTitle accent={'indigo'}>
          {'Personnaliser le document'}
        </SectionTitle>
        <p className="text-[13px] text-muted mb-4">
          {'Donnez au PDF votre image professionnelle : logo, couleur de marque et mentions légales apparaîtront sur la page de garde et en en-tête de chaque page.'}
        </p>

        {/* Logo */}
        <Label>{"Logo de l'entreprise (PNG ou JPG)"}</Label>
        <div
          onClick={() => logoRef.current?.click()}
          className="cursor-pointer rounded-xl2 border-2 border-dashed border-line-strong bg-muted-bg/60 hover:border-indigo px-4 py-4 flex items-center gap-3 transition-all"
        >
          <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg" className="sr-only"
            onChange={(e) => onLogo(e.target.files?.[0])} />
          <div className="w-12 h-12 rounded-[10px] grid place-items-center bg-card border border-line overflow-hidden shrink-0">
            {brand.logo ? <img src={brand.logo} alt="logo" className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-muted" />}
          </div>
          <div className="text-[13px] min-w-0">
            {brand.logo ? (
              <span className="inline-flex items-center gap-2 font-semibold flex-wrap">
                <span className="truncate max-w-[180px]">{brand.logoName}</span>
                <button onClick={(e) => { e.stopPropagation(); setBrand((b) => ({ ...b, logo: null, logoName: '' })) }} className="text-muted hover:text-laterite shrink-0"><X size={13} /></button>
              </span>
            ) : (
              <span className="text-muted">{'Cliquez pour ajouter votre logo'}</span>
            )}
          </div>
        </div>

        {/* Couleur */}
        <div className="mt-4">
          <Label><span className="inline-flex items-center gap-1.5"><Palette size={13} /> Couleur du document</span></Label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="color" value={brand.color}
              onChange={(e) => setBrand((b) => ({ ...b, color: e.target.value }))}
              className="w-10 h-10 rounded-[8px] border border-line bg-card cursor-pointer p-0.5" />
            {PRESETS.map((c) => (
              <button key={c} onClick={() => setBrand((b) => ({ ...b, color: c }))}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: brand.color === c ? '#221a16' : 'transparent' }}
                aria-label={c} />
            ))}
            <span className="font-mono text-[12px] text-muted ml-1">{brand.color}</span>
          </div>
        </div>

        {/* Slogan */}
        <div className="mt-4">
          <Label>{'Slogan / sous-titre'}</Label>
          <Input value={brand.slogan} onChange={(e) => setBrand((b) => ({ ...b, slogan: e.target.value }))}
            placeholder={'Ex. : Métré & Devis Quantitatif Estimatif'} />
        </div>

        {/* Coordonnées */}
        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
            <BadgeCheck size={13} /> {'Mentions professionnelles (page de garde)'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label><span className="inline-flex items-center gap-1.5"><Phone size={12} /> Téléphone</span></Label>
              <Input value={brand.telephone} onChange={(e) => setBrand((b) => ({ ...b, telephone: e.target.value }))}
                placeholder="Ex. : +229 …" />
            </div>
            <div>
              <Label><span className="inline-flex items-center gap-1.5"><Mail size={12} /> E-mail</span></Label>
              <Input value={brand.email} onChange={(e) => setBrand((b) => ({ ...b, email: e.target.value }))}
                placeholder={'Ex. : contact@entreprise.bj'} />
            </div>
            <div className="sm:col-span-2">
              <Label><span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {'Adresse / siège'}</span></Label>
              <Input value={brand.adresse} onChange={(e) => setBrand((b) => ({ ...b, adresse: e.target.value }))}
                placeholder={'Ex. : Quartier, ville, pays'} />
            </div>
            {(
              <>
                <div>
                  <Label>N° RCCM</Label>
                  <Input value={brand.rccm} onChange={(e) => setBrand((b) => ({ ...b, rccm: e.target.value }))}
                    placeholder="Ex. : RB/COT/…" />
                </div>
                <div>
                  <Label>N° IFU</Label>
                  <Input value={brand.ifu} onChange={(e) => setBrand((b) => ({ ...b, ifu: e.target.value }))}
                    placeholder="Ex. : 3 2026 …" />
                </div>
              </>
            )}
          </div>
          <p className="text-[12px] text-muted mt-2">
            {"Ces informations renforcent le caractère professionnel du document remis au client ou au maître d'ouvrage."}
          </p>
        </div>
      </Card>
      {/* ── Options & génération ── */}
      <Card className="p-5" accent="jade">
        <SectionTitle accent="jade">Options & génération</SectionTitle>

        <div className="grid gap-3 mb-4 text-[13.5px]">
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={opts.pageGarde}
              onChange={(e) => setOpts({ ...opts, pageGarde: e.target.checked })}
              className="w-4 h-4 accent-indigo" />
            Inclure une page de garde
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={opts.sousDetail}
              onChange={(e) => setOpts({ ...opts, sousDetail: e.target.checked })}
              className="w-4 h-4 accent-indigo" />
            Inclure le sous-détail des prix unitaires
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={opts.metresComplets}
              onChange={(e) => setOpts({ ...opts, metresComplets: e.target.checked })}
              className="w-4 h-4 accent-indigo" />
            Inclure le récapitulatif complet des métrés
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={opts.pagination}
              onChange={(e) => setOpts({ ...opts, pagination: e.target.checked })}
              className="w-4 h-4 accent-indigo" />
            Numérotation des pages
          </label>
        </div>

        {/* Aperçu en-tête */}
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-1.5">Aperçu de l'en-tête</p>
        <div className="rounded-xl2 overflow-hidden border border-line mb-4">
          <div className="px-4 py-3 text-white flex items-center justify-between gap-3" style={{ background: brand.color }}>
            <div className="min-w-0">
              <b className="font-display text-[15px] block truncate">
                {proj.entreprise || 'Votre entreprise'}
              </b>
              {brand.slogan && <span className="text-[11px] opacity-85 block truncate">{brand.slogan}</span>}
            </div>
            {brand.logo && (
              <div className="w-12 h-11 rounded-[6px] bg-white grid place-items-center overflow-hidden shrink-0">
                <img src={brand.logo} alt="logo" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Récap chiffré */}
        <div className="bg-muted-bg border border-line rounded-xl2 p-4 mb-4 text-[13px]">
          <p>Projet : <b>{proj.titre || proj.entreprise || '(non renseigné)'}</b></p>
          <p className="mt-1">Total HT : <b>{fmtCFA(dqe.ht)}</b> · TTC : <b>{fmtCFA(dqe.ttc)}</b> <span className="text-muted">(gros œuvre uniquement)</span></p>
          {alertes.length > 0 && (
            <p className="text-soleil-deep text-[12px] mt-1 font-semibold">
              ⚠ {alertes.length} point(s) à vérifier seront imprimés dans le PDF — contrôlez-les dans l'onglet DQE.
            </p>
          )}
          <p className="text-muted text-[12px] mt-1">{dqe.lignes.length} postes · K = {params.K} · TVA 18 %</p>
          <p className="text-muted text-[12px] mt-1">
            {[
              opts.pageGarde && 'page de garde',
              'informations projet',
              'DQE',
              opts.sousDetail && 'sous-détail des prix',
              opts.metresComplets && 'métrés complets',
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        <Button variant="accent" onClick={handleExport} disabled={loading || dqe.lignes.length === 0} className="w-full sm:w-auto">
          {loading ? <Loader size={15} className="animate-spin" /> : <FileDown size={15} />}
          {loading ? 'Génération…' : 'Télécharger le PDF personnalisé'}
        </Button>
        {loading && <p className="text-[12.5px] text-muted mt-3">Mise en page du document en cours — la première génération peut prendre quelques secondes.</p>}
        {info && <p className="text-[12.5px] text-soleil-deep font-semibold mt-3">{info}</p>}
        {dqe.lignes.length === 0 && (
          <p className="text-[12.5px] text-muted mt-3">
            Aucune donnée à exporter — saisissez des dimensions dans l'onglet <b>Niveaux & métré</b>.
          </p>
        )}
        <Badge variant="ok" className="mt-3"><FileDown size={12} /> Document complet, prêt à transmettre</Badge>
      </Card>
    </div>
  )
}
