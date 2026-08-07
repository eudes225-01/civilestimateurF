// src/components/tabs/TabExport.jsx
import React, { useState, useRef } from 'react'
import { FileDown, Loader, Image as ImageIcon, X, Palette, BadgeCheck, MapPin, Phone, Mail } from 'lucide-react'
import { Card, Button, SectionTitle, Label, Input, Badge } from '../ui/index.jsx'
import { buildDQE, buildSousDetail } from 'civilestimateur-engine'
import { fmtCFA, fmtDate } from '../../lib/format.js'

// Formatage des nombres pour le PDF : espace ASCII comme séparateur de milliers
// (évite l'espace fine insécable U+202F que les polices PDF standard n'affichent pas).
const pdfNum = (n, dec = 0) => {
  const x = Math.round((+n || 0) * 10 ** dec) / 10 ** dec
  const [int, frac] = x.toFixed(dec).split('.')
  const sep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return frac ? `${sep},${frac}` : sep
}

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [30, 42, 120]
}

// Éclaircit/fonce une couleur RGB d'un facteur (-1 à 1)
const shade = ([r, g, b], f) => {
  const adj = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f)
  return [adj(r), adj(g), adj(b)]
}

const PRESETS = ['#1e2a78', '#e0532f', '#0fa36b', '#17b3c7', '#7c3aed', '#0f172a']

// Liste exhaustive des quantités/métrés calculées par le moteur (aucune omission)
const METRES_COMPLETS = [
  ['Ldev',           'Développé linéaire de murs',                 'm'],
  ['Ssol',           'Surface des pièces (Σ niveaux)',             'm²'],
  ['Smur',           'Surface de maçonnerie nette (tous types)',   'm²'],
  ['Souv',           'Surface des ouvertures (portes/fenêtres)',   'm²'],
  ['enduitInt',      "Enduit intérieur",                           'm²'],
  ['enduitExt',      "Enduit extérieur",                           'm²'],
  ['mortierPose',    'Mortier de pose',                            'm³'],
  ['volPleineMasse', 'Fouille en pleine masse',                    'm³'],
  ['volFouille',     'Fouilles totales',                           'm³'],
  ['volRemblai',     'Remblai / évacuation',                       'm³'],
  ['volProprete',    'Béton de propreté',                          'm³'],
  ['volSemelle',     'BA semelles + avant-poteaux',                'm³'],
  ['volChainageBas', 'BA chaînages & longrines',                   'm³'],
  ['volBanche',      'Gros béton banché',                          'm³'],
  ['volMoellons',    'Moellons en fondation',                      'm³'],
  ['surfArase',      'Arase étanche',                              'm²'],
  ['surfHerisson',   'Hérissonnage',                               'm²'],
  ['volPoteaux',     'BA poteaux & raidisseurs',                   'm³'],
  ['volPoutres',     'BA poutres',                                 'm³'],
  ['volLinteaux',    'Linteaux BA (générés des ouvertures)',       'm³'],
  ['volDalle',       'Béton des planchers (tous types)',           'm³'],
  ['surfHourdis',    'Planchers hourdis (surface)',                'm²'],
  ['entrevous',      'Entrevous (corps creux)',                    'u'],
  ['volBA',          'Volume de béton armé total',                 'm³'],
  ['agglos',         'Blocs de maçonnerie (avec pertes)',          'u'],
  ['acierKg',        'Acier HA (calcul par élément)',              'kg'],
  ['cimentSacs',     'Ciment estimé',                              'sacs 50 kg'],
  ['surfToiture',    'Surface de couverture / étanchéité',         'm²'],
]

export default function TabExport({ proj, totaux, prix, params, alertes = [], isPro }) {
  const [loading, setLoading] = useState(false)
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
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210, H = 297, M = 12
      const [r, g, b] = hexToRgb(brand.color)
      const [rDark, gDark, bDark] = shade([r, g, b], -0.35)
      const today = fmtDate(new Date())
      const nomEntreprise = isPro
        ? (proj.entreprise || 'Entreprise non renseignée')
        : (proj.mo || 'Particulier')

      const drawHeaderBand = (titre) => {
        doc.setFillColor(r, g, b)
        doc.rect(0, 0, W, 22, 'F')
        if (brand.logo) {
          try {
            const fmt = brand.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.setFillColor(255, 255, 255)
            doc.roundedRect(W - M - 17, 3, 17, 16, 2, 2, 'F')
            doc.addImage(brand.logo, fmt, W - M - 16, 4, 15, 14, undefined, 'FAST')
          } catch (_) { /* logo ignoré si invalide */ }
        }
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(12.5); doc.setFont('helvetica', 'bold')
        doc.text(nomEntreprise, M, 9)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
        doc.text(titre, M, 15.5)
        doc.setFontSize(7)
        doc.text(`Édité le ${today}`, W - M - (brand.logo ? 21 : 0), 19, { align: 'right' })
      }

      const drawFooterLegal = () => {
        doc.setDrawColor(225, 220, 212)
        doc.line(M, H - 14, W - M, H - 14)
        doc.setFontSize(6.5); doc.setTextColor(140, 134, 128); doc.setFont('helvetica', 'normal')
        const legal = [
          brand.rccm && `RCCM : ${brand.rccm}`,
          brand.ifu && `IFU : ${brand.ifu}`,
          brand.telephone && `Tél. : ${brand.telephone}`,
          brand.email && `E-mail : ${brand.email}`,
        ].filter(Boolean).join('   ·   ')
        if (legal) doc.text(legal, M, H - 10)
        if (brand.adresse) doc.text(brand.adresse, M, H - 6.5)
      }

      // ════════════════════════════════════════════════════════════
      // PAGE DE GARDE
      // ════════════════════════════════════════════════════════════
      if (opts.pageGarde) {
        doc.setFillColor(r, g, b)
        doc.rect(0, 0, W, 8, 'F')
        doc.setFillColor(rDark, gDark, bDark)
        doc.rect(0, H - 8, W, 8, 'F')
        doc.setFillColor(r, g, b)
        doc.rect(0, H - 14, W, 6, 'F')

        doc.setDrawColor(r, g, b)
        doc.setLineWidth(0.6)
        doc.rect(M, 20, W - 2 * M, H - 20 - 20)

        let cy = 42

        if (brand.logo) {
          try {
            const fmt = brand.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.setFillColor(255, 255, 255)
            doc.roundedRect(W / 2 - 17, cy, 34, 30, 3, 3, 'F')
            doc.setDrawColor(r, g, b); doc.setLineWidth(0.4)
            doc.roundedRect(W / 2 - 17, cy, 34, 30, 3, 3)
            doc.addImage(brand.logo, fmt, W / 2 - 15, cy + 2, 30, 26, undefined, 'FAST')
            cy += 40
          } catch (_) { cy += 8 }
        } else {
          doc.setFillColor(r, g, b)
          doc.circle(W / 2, cy + 12, 14, 'F')
          doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
          doc.text((nomEntreprise[0] || 'E').toUpperCase(), W / 2, cy + 16, { align: 'center' })
          cy += 34
        }

        doc.setTextColor(26, 26, 26)
        doc.setFontSize(19); doc.setFont('helvetica', 'bold')
        doc.text(nomEntreprise, W / 2, cy, { align: 'center' }); cy += 7
        if (brand.slogan) {
          doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 110)
          doc.text(brand.slogan, W / 2, cy, { align: 'center' }); cy += 14
        } else cy += 8

        doc.setFillColor(r, g, b)
        doc.roundedRect(W / 2 - 60, cy, 120, 10, 2, 2, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(11.5); doc.setFont('helvetica', 'bold')
        doc.text('BORDEREAU DES PRIX & DEVIS QUANTITATIF ESTIMATIF', W / 2, cy + 6.7, { align: 'center' })
        cy += 22

        doc.setDrawColor(220, 213, 200); doc.setLineWidth(0.3)
        doc.line(W / 2 - 70, cy, W / 2 + 70, cy)
        cy += 8

        const infosGarde = isPro ? [
          proj.titre && ['Projet', proj.titre],
          proj.mo && ["Maître d'ouvrage", proj.mo],
          proj.ref && ['Référence / N° marché', proj.ref],
          proj.ville && ['Localisation', proj.ville],
        ].filter(Boolean) : [
          proj.mo && ['Demandeur', proj.mo],
          proj.entreprise && ['Type de projet', proj.entreprise],
          proj.titre && ['Description', proj.titre],
          proj.ref && ['Téléphone', proj.ref],
          proj.ville && ['Localisation', proj.ville],
        ].filter(Boolean)

        doc.setFontSize(10)
        infosGarde.forEach(([k, v]) => {
          doc.setFont('helvetica', 'bold'); doc.setTextColor(90, 90, 90)
          doc.text(`${k}`, W / 2 - 65, cy)
          doc.setFont('helvetica', 'normal'); doc.setTextColor(26, 26, 26)
          const lines = doc.splitTextToSize(String(v), 95)
          doc.text(lines, W / 2 + 5, cy)
          cy += 6.5 * lines.length
        })

        cy += 6
        doc.setDrawColor(220, 213, 200)
        doc.line(W / 2 - 70, cy, W / 2 + 70, cy)
        cy += 10

        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
        doc.text(`Document édité le ${today}`, W / 2, cy, { align: 'center' })

        const idLines = [
          brand.adresse && brand.adresse,
          [brand.telephone, brand.email].filter(Boolean).join('   ·   '),
          [brand.rccm && `RCCM ${brand.rccm}`, brand.ifu && `IFU ${brand.ifu}`].filter(Boolean).join('   ·   '),
        ].filter(Boolean)
        let idY = H - 24
        doc.setFontSize(7.5); doc.setTextColor(140, 134, 128)
        idLines.forEach((l) => { doc.text(l, W / 2, idY, { align: 'center' }); idY += 4 })

        doc.addPage()
      }

      // ════════════════════════════════════════════════════════════
      // PAGE — INFORMATIONS DU PROJET
      // ════════════════════════════════════════════════════════════
      drawHeaderBand(isPro ? "Informations du projet & maître d'ouvrage" : 'Informations du projet')
      let y = 30
      doc.setTextColor(26, 26, 26)

      const infos = isPro ? [
        proj.titre && ['Projet', proj.titre],
        proj.mo && ["Maître d'ouvrage", proj.mo],
        proj.entreprise && ['Entreprise / BET', proj.entreprise],
        proj.ref && ['Référence', proj.ref],
        proj.ville && ['Localisation', proj.ville],
        totaux.toiture?.lab && ['Type de toiture', totaux.toiture.lab],
        ['Coefficient de majoration (K)', String(params.K || 1.3)],
      ].filter(Boolean) : [
        proj.mo && ['Demandeur', proj.mo],
        proj.entreprise && ['Type de projet', proj.entreprise],
        proj.titre && ['Description', proj.titre],
        proj.ref && ['Téléphone', proj.ref],
        proj.ville && ['Localisation', proj.ville],
        totaux.toiture?.lab && ['Type de toiture', totaux.toiture.lab],
        ['Coefficient de majoration (K)', String(params.K || 1.3)],
      ].filter(Boolean)

      doc.setFontSize(10.5); doc.setFont('helvetica', 'bold')
      doc.text(isPro ? 'Informations du projet' : 'Mon projet de construction', M, y); y += 6
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      infos.forEach(([k, v]) => {
        doc.setTextColor(110, 110, 110); doc.text(`${k} :`, M, y)
        doc.setTextColor(26, 26, 26)
        const lines = doc.splitTextToSize(String(v), W - 2 * M - 42)
        doc.text(lines, M + 40, y)
        y += 5.5 * lines.length
      })
      y += 4

      if (isPro) {
        doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
        doc.text("Identité de l'entreprise", M, y); y += 6
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        const idEnt = [
          brand.adresse && ['Adresse', brand.adresse],
          brand.telephone && ['Téléphone', brand.telephone],
          brand.email && ['E-mail', brand.email],
          brand.rccm && ['RCCM', brand.rccm],
          brand.ifu && ['IFU', brand.ifu],
        ].filter(Boolean)
        if (idEnt.length) {
          idEnt.forEach(([k, v]) => {
            doc.setTextColor(110, 110, 110); doc.text(`${k} :`, M, y)
            doc.setTextColor(26, 26, 26); doc.text(String(v), M + 40, y)
            y += 5.5
          })
        } else {
          doc.setTextColor(150, 150, 150)
          doc.text('Coordonnées non renseignées.', M, y); y += 5.5
        }
      } else {
        doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
        doc.text('Coordonnées du demandeur', M, y); y += 6
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        const idPart = [
          proj.mo && ['Nom', proj.mo],
          proj.ref && ['Téléphone', proj.ref],
          brand.email && ['E-mail', brand.email],
          brand.adresse && ['Adresse', brand.adresse],
        ].filter(Boolean)
        if (idPart.length) {
          idPart.forEach(([k, v]) => {
            doc.setTextColor(110, 110, 110); doc.text(`${k} :`, M, y)
            doc.setTextColor(26, 26, 26); doc.text(String(v), M + 40, y)
            y += 5.5
          })
        } else {
          doc.setTextColor(150, 150, 150)
          doc.text('Coordonnées non renseignées.', M, y); y += 5.5
        }
      }

      drawFooterLegal()

      // ════════════════════════════════════════════════════════════
      // PAGE — DQE (Devis Quantitatif Estimatif)
      // ════════════════════════════════════════════════════════════
      doc.addPage()
      drawHeaderBand('Devis Quantitatif Estimatif (DQE)')
      y = 30
      doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
      doc.text('Devis Quantitatif Estimatif', M, y); y += 5

      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M, bottom: 18 },
        theme: 'grid',
        head: [['N°', 'Désignation', 'U', 'Qté', 'PU (FCFA)', 'Montant HT (FCFA)']],
        body: dqe.lignes.map((l) => [l.n, l.des, l.u, pdfNum(l.q, 2), pdfNum(l.pu, 0), pdfNum(l.montant, 0)]),
        foot: [
          ['', '', '', '', 'Total HT', pdfNum(dqe.ht, 0)],
          ['', '', '', '', 'TVA 18 %', pdfNum(dqe.tva, 0)],
          ['', '', '', '', 'Total TTC', pdfNum(dqe.ttc, 0)],
        ],
        styles: { fontSize: 8.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [243, 240, 233], textColor: 26, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 13, halign: 'center' },
          1: { cellWidth: 74 },
          2: { cellWidth: 11, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 36, halign: 'right' },
        },
        didParseCell: (d) => {
          if (d.section === 'foot' && d.row.index === 2) {
            d.cell.styles.fillColor = [r, g, b]
            d.cell.styles.textColor = 255
          }
        },
        didDrawPage: () => drawHeaderBand('Devis Quantitatif Estimatif (DQE) — suite'),
      })

      // Périmètre couvert (B2) + points à vérifier (A7)
      let yAp = doc.lastAutoTable.finalY + 5
      const blocInfo = (titre, lignesTxt, fill, txtCol) => {
        const largeur = W - 2 * M
        const corps = lignesTxt.flatMap((t) => doc.splitTextToSize(t, largeur - 8))
        const h = 7 + corps.length * 3.6
        if (yAp + h > H - 18) { doc.addPage(); drawHeaderBand('Devis Quantitatif Estimatif (DQE) — suite'); yAp = 30 }
        doc.setFillColor(...fill)
        doc.roundedRect(M, yAp, largeur, h, 1.5, 1.5, 'F')
        doc.setFontSize(7.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...txtCol)
        doc.text(titre, M + 4, yAp + 4.6)
        doc.setFont('helvetica', 'normal')
        doc.text(corps, M + 4, yAp + 8.6)
        yAp += h + 3.5
      }
      blocInfo('PÉRIMÈTRE DU DEVIS', [
        'DQE gros œuvre (terrassement → couverture). HORS SECOND ŒUVRE : assainissement, étanchéité détaillée,',
        'revêtements, faux plafonds, plomberie, électricité, menuiseries. Le total ci-dessus ne représente pas le coût complet du projet.',
      ], [232, 236, 250], [30, 42, 120])
      if (alertes.length) {
        blocInfo(`POINTS À VÉRIFIER (${alertes.length})`, alertes.map((a) => `• [${a.niveau.toUpperCase()}] ${a.msg}`), [253, 242, 222], [146, 90, 10])
      }
      blocInfo('NATURE DES RÉSULTATS', [
        "Estimation indicative générée par calcul automatique assisté : elle ne remplace ni un métré d'exécution,",
        'ni une étude technique, ni les prix réels du marché. À vérifier par un professionnel avant tout engagement.',
      ], [243, 240, 233], [90, 90, 90])
      drawFooterLegal()

      // ════════════════════════════════════════════════════════════
      // PAGES — SOUS-DÉTAIL DES PRIX UNITAIRES
      // ════════════════════════════════════════════════════════════
      if (opts.sousDetail && sousDetail.length) {
        doc.addPage()
        drawHeaderBand('Sous-détail des prix unitaires')
        y = 30
        doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
        doc.text('Sous-détail des prix unitaires (déboursé sec)', M, y); y += 4
        doc.setFontSize(7.8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
        doc.text("Décomposition matériaux / main d'œuvre / matériel, avant majoration K (aléas, frais généraux, bénéfice).", M, y)
        y += 6

        sousDetail.forEach((sd) => {
          if (y > H - 50) { doc.addPage(); drawHeaderBand('Sous-détail des prix unitaires — suite'); y = 30 }

          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
          doc.text(`${sd.n} — ${sd.des} (${sd.u})`, M, y)
          y += 1

          autoTable(doc, {
            startY: y + 2,
            margin: { left: M, right: M, bottom: 18 },
            theme: 'grid',
            head: [['Composante', 'Montant (FCFA)', '% déboursé']],
            body: [
              ...sd.composantes.map((c) => [
                c.lib, pdfNum(c.montant, 0),
                sd.deboursesSec > 0 ? `${pdfNum((c.montant / sd.deboursesSec) * 100, 1)} %` : '0,0 %',
              ]),
              ['Déboursé sec', pdfNum(sd.deboursesSec, 0), '100 %'],
              [`Majoration (K = ${sd.coeffK})`, `+ ${pdfNum(sd.majoration, 0)}`, '—'],
              ['Prix de vente unitaire', pdfNum(sd.puVente, 0), '—'],
            ],
            styles: { fontSize: 8, cellPadding: { top: 1.6, right: 2.5, bottom: 1.6, left: 2.5 } },
            headStyles: { fillColor: [110, 110, 110], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 96 },
              1: { cellWidth: 46, halign: 'right' },
              2: { cellWidth: 30, halign: 'right' },
            },
            didParseCell: (d) => {
              if (d.section === 'body' && d.row.index === sd.composantes.length) {
                d.cell.styles.fillColor = [243, 240, 233]; d.cell.styles.fontStyle = 'bold'
              }
              if (d.section === 'body' && d.row.index === sd.composantes.length + 2) {
                d.cell.styles.fillColor = [r, g, b]; d.cell.styles.textColor = 255; d.cell.styles.fontStyle = 'bold'
              }
            },
            didDrawPage: () => drawHeaderBand('Sous-détail des prix unitaires — suite'),
          })
          y = doc.lastAutoTable.finalY + 7
        })
        drawFooterLegal()
      }

      // ════════════════════════════════════════════════════════════
      // PAGE — RÉCAPITULATIF COMPLET DES QUANTITÉS (MÉTRÉS)
      // ════════════════════════════════════════════════════════════
      if (opts.metresComplets) {
        doc.addPage()
        drawHeaderBand('Récapitulatif complet des quantités (métrés)')
        y = 30
        doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
        doc.text('Récapitulatif complet des quantités (métrés)', M, y); y += 5

        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M, bottom: 18 },
          theme: 'grid',
          head: [['Désignation', 'Quantité', 'Unité']],
          body: METRES_COMPLETS.map(([k, lab, u]) => [lab, pdfNum(totaux[k], 2), u]),
          styles: { fontSize: 8.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak' },
          headStyles: { fillColor: [110, 110, 110], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 26, halign: 'center' },
          },
          didDrawPage: () => drawHeaderBand('Récapitulatif complet des quantités (métrés) — suite'),
        })
        drawFooterLegal()
      }

      // ════════════════════════════════════════════════════════════
      // Pied de page : pagination + mentions
      // ════════════════════════════════════════════════════════════
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        if (opts.pageGarde && i === 1) continue
        doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        if (opts.pagination) doc.text(`Page ${i} / ${pageCount}`, W - M, H - 3, { align: 'right' })
        doc.text('Résultats indicatifs — RPR 26.2 (mars 2026) · Document généré par CivilEstimator', M, H - 3)
      }

      const name = `BPU_DQE_${(proj.titre || 'projet').replace(/[^\w\-]+/g, '_')}_${today.replace(/\//g, '-')}.pdf`
      doc.save(name)
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
      <Card className="p-5" accent={isPro ? 'indigo' : 'laterite'}>
        <SectionTitle accent={isPro ? 'indigo' : 'laterite'}>
          {isPro ? 'Personnaliser le document' : 'Personnaliser mon estimation'}
        </SectionTitle>
        <p className="text-[13px] text-muted mb-4">
          {isPro
            ? 'Donnez au PDF votre image professionnelle : logo, couleur de marque et mentions légales apparaîtront sur la page de garde et en en-tête de chaque page.'
            : "Personnalisez votre document d'estimation : couleur et coordonnées facultatives pour le PDF à conserver ou partager."}
        </p>

        {/* Logo */}
        <Label>{isPro ? "Logo de l'entreprise (PNG ou JPG)" : 'Photo ou image (optionnel)'}</Label>
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
              <span className="text-muted">{isPro ? 'Cliquez pour ajouter votre logo' : 'Cliquez pour ajouter une image (optionnel)'}</span>
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
          <Label>{isPro ? 'Slogan / sous-titre' : 'Sous-titre du document (optionnel)'}</Label>
          <Input value={brand.slogan} onChange={(e) => setBrand((b) => ({ ...b, slogan: e.target.value }))}
            placeholder={isPro ? 'Ex. : Métré & Devis Quantitatif Estimatif' : 'Ex. : Estimation pour ma maison familiale'} />
        </div>

        {/* Coordonnées */}
        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
            <BadgeCheck size={13} /> {isPro ? 'Mentions professionnelles (page de garde)' : 'Vos coordonnées (optionnel)'}
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
                placeholder={isPro ? 'Ex. : contact@entreprise.bj' : 'Ex. : votre@email.com'} />
            </div>
            <div className="sm:col-span-2">
              <Label><span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {isPro ? 'Adresse / siège' : 'Adresse du terrain'}</span></Label>
              <Input value={brand.adresse} onChange={(e) => setBrand((b) => ({ ...b, adresse: e.target.value }))}
                placeholder={isPro ? 'Ex. : Quartier, ville, pays' : 'Ex. : Quartier Cadjèhoun, Cotonou'} />
            </div>
            {isPro && (
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
            {isPro
              ? "Ces informations renforcent le caractère professionnel du document remis au client ou au maître d'ouvrage."
              : "Ces informations sont optionnelles et n'apparaîtront que sur votre document PDF."}
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
                {isPro ? (proj.entreprise || 'Votre entreprise') : (proj.mo || 'Mon projet')}
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
          <p>{isPro ? 'Projet' : 'Mon projet'} : <b>{proj.titre || proj.entreprise || '(non renseigné)'}</b></p>
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
