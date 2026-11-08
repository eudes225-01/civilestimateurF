// src/lib/pdfServeur.js
// Export PDF « haute qualité » : le navigateur envoie le modèle du document au backend, qui le
// met en page en HTML/CSS (Space Grotesk + Inter, en-têtes/pieds répétés, chapitres, arrêté en
// lettres…) et renvoie le PDF rendu par Chromium. Renvoie null si aucun backend n'est configuré.
import { api } from './api.js'
import { fmtDate, fmtMois } from './format.js'
import { METRES_COMPLETS } from './pdfLegacy.js'

/** Modèle sérialisable du document (tout est déjà calculé : le serveur ne recalcule rien). */
export function construireModele({ proj, totaux, params, prixInfo, brand, opts, dqe, sousDetail, materiaux, couverture }) {
  return {
    proj: { titre: proj.titre, mo: proj.mo, entreprise: proj.entreprise, ref: proj.ref, ville: proj.ville },
    brand: {
      color: brand.color, logo: brand.logo, slogan: brand.slogan, telephone: brand.telephone,
      email: brand.email, adresse: brand.adresse, rccm: brand.rccm, ifu: brand.ifu,
    },
    opts,
    dqe: {
      lignes: dqe.lignes.map(({ n, des, u, q, pu, montant, estime }) => ({ n, des, u, q, pu, montant, estime })),
      ht: dqe.ht, tva: dqe.tva, ttc: dqe.ttc,
      // Mode de chiffrage, statut du total et composants « inclus » : le PDF dit ce qui est facturé et ce qui ne l'est pas en plus.
      mode: dqe.mode, statut: dqe.statut, libelleTotal: dqe.libelleTotal, raisonsIncomplet: dqe.raisonsIncomplet,
      inclus: (dqe.inclus || []).map(({ des, u, q, inclusDans }) => ({ des, u, q, inclusDans })),
    },
    materiaux: (materiaux?.synthese || totaux.materiaux?.synthese || []).map(({ code, designation, unite, quantite, quantiteCommande, statut, ouvrages }) => ({ code, designation, unite, quantite, quantiteCommande, statut, ouvrages })),
    hypotheses: (totaux.hypotheses || []).map(({ lib, valeur, statut }) => ({ lib, valeur, statut })),
    aConfirmer: (couverture?.aConfirmer || []).filter((x) => x.etat === 'a_confirmer').map((x) => x.sujet),
    sousDetail: sousDetail.map((s) => ({
      n: s.n, des: s.des, u: s.u, composantes: s.composantes.map((c) => ({ lib: c.lib, montant: c.montant })),
      deboursesSec: s.deboursesSec, coeffK: s.coeffK, majoration: s.majoration, puVente: s.puVente,
    })),
    metres: METRES_COMPLETS
      .filter(([k]) => Math.round((+totaux[k] || 0) * 100) !== 0)
      .map(([k, lib, u]) => ({ lib, q: +totaux[k], u })),
    // Aucune déclaration (points à vérifier) dans le document remis au client : s'il y en a de bloquantes,
    // l'export est refusé en amont (TabExport) ; les autres se consultent dans l'onglet DQE.
    alertes: [],
    meta: {
      K: params.K || 1.3,
      toiture: totaux.toiture?.lab || '',
      perimetre: dqe.perimetre || '',
      modeChiffrage: dqe.mode, modeLabel: dqe.modeLabel || '',
      prixVersion: prixInfo?.version || dqe.baseDePrix?.version || 'RPR',
      prixDate: prixInfo?.date ? fmtMois(prixInfo.date) : (dqe.baseDePrix?.date || ''),
      date: fmtDate(new Date()),
    },
  }
}

/** @returns {Promise<Blob|null>} le PDF, ou null si le serveur n'est pas configuré. Lève en cas d'échec. */
export async function pdfServeur(ctx) {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), 90_000) // démarrage à froid de Render + Chromium
  try {
    return await api.pdfDevis(construireModele(ctx), ctrl.signal)
  } finally {
    clearTimeout(minuteur)
  }
}

export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: nom })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
