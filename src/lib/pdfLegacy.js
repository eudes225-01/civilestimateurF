// src/lib/pdfLegacy.js
// Export PDF « local » (jsPDF) : généré entièrement dans le navigateur.
// Sert de secours quand le serveur de rendu HTML/CSS est indisponible (voir TabExport.jsx).
import { fmtDate } from './format.js'

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

const CHAPITRES_DQE = {
  1: 'Terrassement', 2: 'Fondations', 3: 'Structure en élévation', 4: 'Planchers', 5: 'Maçonnerie',
  6: 'Enduits et peinture', 7: 'Aciers', 8: 'Couverture', 9: 'Granulats', 10: 'Coffrage',
  11: 'Plomberie et assainissement', 12: 'Électricité',
}
const regrouperParChapitre = (lignes) => {
  const groupes = new Map()
  for (const ligne of lignes) {
    const n = Number.parseInt(String(ligne.n).split('.')[0], 10) || 0
    if (!groupes.has(n)) groupes.set(n, { n, titre: CHAPITRES_DQE[n] || `Chapitre ${n}`, lignes: [] })
    groupes.get(n).lignes.push(ligne)
  }
  return [...groupes.values()].sort((a, b) => a.n - b.n)
}
const designationPdf = (s) => String(s || '')
  .replace(/Aciers HA\s*[—–-]\s*estimation par ratios \(ferraillage non détaillé\),?\s*tous éléments/i, 'Aciers HA')
  .replace(/\s*\([^)]*(?:estim|estimation)[^)]*\)/gi, '')
  .replace(/\s*[—–-]\s*[^,;]*(?:estim|estimation)[^,;]*/gi, '')
  .replace(/\b(?:estimé|estimée|estimés|estimées|estimation)\b/gi, '')
  .replace(/\s{2,}/g, ' ').trim()

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
  ['volFormeDallage','Forme de dallage en béton (RDC)',            'm³'],
  ['surfHourdis',    'Planchers hourdis (surface)',                'm²'],
  ['entrevous',      'Entrevous (corps creux)',                    'u'],
  ['volBA',          'Volume de béton armé total',                 'm³'],
  ['agglos',         'Blocs de maçonnerie (avec pertes)',          'u'],
  ['acierKg',        'Acier HA (calcul par élément)',              'kg'],
  ['cimentSacs',     'Ciment estimé',                              'sacs 50 kg'],
  ['surfToiture',    'Surface de couverture / étanchéité',         'm²'],
]

/** Génère et télécharge le PDF dans le navigateur. Lève une erreur en cas d'échec. */
export async function exportPdfLegacy({ proj, totaux, brand, opts, dqe, materiaux }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 12
  const [r, g, b] = hexToRgb(brand.color)
  const [rDark, gDark, bDark] = shade([r, g, b], -0.35)
  const today = fmtDate(new Date())
  const nomEntreprise = proj.entreprise || ''

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

  // ════════════════════════════════════════════════════════════
  // PAGE — DQE (Devis Quantitatif Estimatif)
  // ════════════════════════════════════════════════════════════
  doc.addPage()
  drawHeaderBand('Devis Quantitatif Estimatif (DQE)')
  y = 30
  doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
  doc.text('Devis Quantitatif Estimatif', M, y); y += 5
  const chapitres = regrouperParChapitre(dqe.lignes)
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    theme: 'grid',
    head: [['N°', 'Désignation des ouvrages', 'Unité', 'Qté', 'Prix U (FCFA)', 'Prix total (FCFA)']],
    body: chapitres.flatMap((c) => [
      [{ content: `${c.n}  ${c.titre}`, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [208, 208, 208], textColor: 26, halign: 'left' } }],
      ...c.lignes.map((l) => [l.n, designationPdf(l.des), l.u, pdfNum(l.q, 2), pdfNum(l.pu, 0), pdfNum(l.montant, 0)]),
      [{ content: `Sous-total ${c.n} — ${c.titre}`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [227, 227, 227], textColor: 26, halign: 'right' } },
        { content: pdfNum(c.lignes.reduce((s, l) => s + l.montant, 0), 0), styles: { fontStyle: 'bold', fillColor: [227, 227, 227], textColor: 26, halign: 'right' } }],
    ]),
    foot: [
      ['', '', '', '', 'Total HT', pdfNum(dqe.ht, 0)],
      ['', '', '', '', 'TVA 18 %', pdfNum(dqe.tva, 0)],
      ['', '', '', '', 'Total TTC', pdfNum(dqe.ttc, 0)],
    ],
    styles: { fontSize: 8.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [227, 227, 227], textColor: 26, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [243, 240, 233], textColor: 26, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      1: { cellWidth: 75 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 34, halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.section === 'foot' && d.row.index === 2) {
        d.cell.styles.fillColor = [r, g, b]
        d.cell.styles.textColor = 255
      }
    },
    didDrawPage: () => drawHeaderBand('Devis Quantitatif Estimatif (DQE) — suite'),
  })

  // ════════════════════════════════════════════════════════════
  // PAGE — QUANTITÉS DE MATÉRIAUX
  // ════════════════════════════════════════════════════════════
  const lignesMateriaux = materiaux?.synthese || totaux.materiaux?.synthese || []
  if (lignesMateriaux.length) {
    doc.addPage()
    drawHeaderBand('Quantités de matériaux')
    y = 30
    doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 26)
    doc.text('Quantités de matériaux', M, y); y += 5

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 18 },
      theme: 'grid',
      head: [['Matériau', 'Quantité', 'Unité', 'À commander']],
      body: lignesMateriaux.map((x) => [designationPdf(x.designation), pdfNum(x.quantite, 2), x.unite, pdfNum(x.quantiteCommande ?? x.quantite, /^(sac|u|pce)$/.test(x.unite) ? 0 : 2)]),
      styles: { fontSize: 8.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak' },
      headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: shade([r, g, b], 0.92) },
      columnStyles: {
        0: { cellWidth: 96 },
        1: { cellWidth: 28, halign: 'right' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 38, halign: 'right' },
      },
      didDrawPage: () => drawHeaderBand('Quantités de matériaux — suite'),
    })
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
        .map(([k, lab, u]) => [designationPdf(lab), pdfNum(totaux[k], 2), u]),
      styles: { fontSize: 8.5, cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, overflow: 'linebreak' },
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      alternateRowStyles: { fillColor: shade([r, g, b], 0.92) },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 26, halign: 'center' },
      },
      didDrawPage: () => drawHeaderBand('Récapitulatif complet des quantités (métrés) — suite'),
    })
  }

  // ════════════════════════════════════════════════════════════
  // Pied de page : pagination + mentions
  // ════════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    if (opts.pageGarde && i === 1) continue
    doc.setFontSize(6.5); doc.setTextColor(120, 120, 120)
    const pied = [proj.entreprise, 'barème RPR 26.2 (mars 2026)'].filter(Boolean).join(' — ')
    doc.text(pied, M, H - 3)
    doc.text(`${i} / ${pageCount}`, W - M, H - 3, { align: 'right' })
  }

  const name = `BPU_DQE_${(proj.titre || 'projet').replace(/[^\w\-]+/g, '_')}_${today.replace(/\//g, '-')}.pdf`
  doc.save(name)
}
