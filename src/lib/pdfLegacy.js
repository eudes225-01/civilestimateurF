// src/lib/pdfLegacy.js
// Export PDF « local » (jsPDF) : généré entièrement dans le navigateur.
// Sert de secours quand le serveur de rendu HTML/CSS est indisponible (voir TabExport.jsx).
import { fmtDate, fmtMois } from './format.js'

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

// Liste exhaustive des quantités/métrés calculées par le moteur (aucune omission)
export const METRES_COMPLETS = [
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
  ['volDeblaisEvacuer', 'Déblais à évacuer (foisonnement)',         'm³'],
  ['volRemblaisApport', 'Remblai — apport de matériau',             'm³'],
  ['volSable',       'Sable pour béton',                           'm³'],
  ['volGravier',     'Gravier pour béton',                         'm³'],
  ['coffPoteaux',    'Coffrage poteaux',                           'm²'],
  ['coffPoutres',    'Coffrage poutres',                           'm²'],
  ['coffVoiles',     'Coffrage voiles (2 faces)',                  'm²'],
  ['coffDalle',      'Coffrage dalle (sous-face)',                 'm²'],
  ['volProprete',    'Béton de propreté',                          'm³'],
  ['volSemelle',     'BA semelles + avant-poteaux',                'm³'],
  ['volChainageBas', 'BA chaînages & longrines',                   'm³'],
  ['volBanche',      'Gros béton banché',                          'm³'],
  ['volMoellons',    'Moellons en fondation',                      'm³'],
  ['surfArase',      'Arase étanche',                              'm²'],
  ['surfHerisson',   'Hérissonnage',                               'm²'],
  ['volPoteaux',     'BA poteaux & raidisseurs',                   'm³'],
  ['volPoutres',     'BA poutres',                                 'm³'],
  ['volVoiles',      'BA voiles',                                  'm³'],
  ['volCV',          'BA chaînages verticaux',                     'm³'],
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

/** Génère et télécharge le PDF dans le navigateur. Lève une erreur en cas d'échec. */
export async function exportPdfLegacy({ proj, totaux, params, alertes = [], prixInfo, brand, opts, dqe, sousDetail }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 12
  const [r, g, b] = hexToRgb(brand.color)
  const [rDark, gDark, bDark] = shade([r, g, b], -0.35)
  const today = fmtDate(new Date())
  const nomEntreprise = proj.entreprise || 'Entreprise non renseignée'

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

    const infosGarde = [
      proj.titre && ['Projet', proj.titre],
      proj.mo && ["Maître d'ouvrage", proj.mo],
      proj.ref && ['Référence / N° marché', proj.ref],
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
  drawHeaderBand("Informations du projet & maître d'ouvrage")
  let y = 30
  doc.setTextColor(26, 26, 26)

  const infos = [
    proj.titre && ['Projet', proj.titre],
    proj.mo && ["Maître d'ouvrage", proj.mo],
    proj.entreprise && ['Entreprise / BET', proj.entreprise],
    proj.ref && ['Référence', proj.ref],
    proj.ville && ['Localisation', proj.ville],
    totaux.toiture?.lab && ['Type de toiture', totaux.toiture.lab],
    ['Coefficient de majoration (K)', String(params.K || 1.3)],
  ].filter(Boolean)

  doc.setFontSize(10.5); doc.setFont('helvetica', 'bold')
  doc.text('Informations du projet', M, y); y += 6
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  infos.forEach(([k, v]) => {
    doc.setTextColor(110, 110, 110); doc.text(`${k} :`, M, y)
    doc.setTextColor(26, 26, 26)
    const lines = doc.splitTextToSize(String(v), W - 2 * M - 42)
    doc.text(lines, M + 40, y)
    y += 5.5 * lines.length
  })
  y += 4

  { // identité de l'entreprise
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
    "Estimation établie à partir des dimensions saisies et du barème indiqué.",
    "Elle ne remplace ni un métré d'exécution, ni une étude technique, ni les prix réels du marché :",
    "à valider par le professionnel qui engage l'offre.",
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
      body: METRES_COMPLETS
        .filter(([k]) => Math.round((+totaux[k] || 0) * 100) !== 0)
        .map(([k, lab, u]) => [lab, pdfNum(totaux[k], 2), u]),
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
    doc.text(`Résultats indicatifs — ${prixInfo?.version || 'RPR'}${prixInfo?.date ? ` (${fmtMois(prixInfo.date)})` : ''}`, M, H - 3)
  }

  const name = `BPU_DQE_${(proj.titre || 'projet').replace(/[^\w\-]+/g, '_')}_${today.replace(/\//g, '-')}.pdf`
  doc.save(name)
}
