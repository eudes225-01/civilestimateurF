// src/data/fondations.js
// Recommandations de fondation par ville / zone géotechnique (Bénin).
// Source : études géotechniques de référence et pratiques locales (LNBTP).
// AVERTISSEMENT : indicatif — une étude de sol est obligatoire avant tout chantier.

export const FONDATIONS = {
  avertissement: "Ces données sont indicatives. Une étude géotechnique est obligatoire avant tout projet de construction.",
  // Les 35 plus grandes villes du Bénin (RGPH4, 2013), rattachées à leur zone
  // géotechnique par département : Littoral/Atlantique → côtière (plaine
  // sableuse) ; Ouémé/Mono (zones lagune/lac Ahémé) → lagunaire ; Zou/
  // Collines/Plateau/Couffo (terre de barre) → centre ; Borgou/Alibori/Donga
  // (socle granito-gneissique) → nord ; Atacora (chaîne de l'Atacora,
  // quartzites) → nord-ouest.
  villes: {
    "Cotonou":       "zone_côtière",    // Littoral
    "Abomey-Calavi": "zone_côtière",    // Atlantique
    "Porto-Novo":    "zone_lagunaire",  // Ouémé
    "Parakou":       "zone_nord",       // Borgou
    "Djougou":       "zone_nord_ouest", // Donga
    "Bohicon":       "zone_centre",     // Zou
    "Natitingou":    "zone_nord_ouest", // Atacora
    "Savé":          "zone_centre",     // Collines
    "Abomey":        "zone_centre",     // Zou
    "Nikki":         "zone_nord",       // Borgou
    "Lokossa":       "zone_lagunaire",  // Mono
    "Ouidah":        "zone_côtière",    // Atlantique
    "Dogbo-Tota":    "zone_centre",     // Couffo
    "Kandi":         "zone_nord",       // Alibori
    "Cové":          "zone_centre",     // Zou
    "Malanville":    "zone_nord",       // Alibori
    "Pobé":          "zone_centre",     // Plateau
    "Kérou":         "zone_nord_ouest", // Atacora
    "Savalou":       "zone_centre",     // Collines
    "Sakété":        "zone_centre",     // Plateau
    "Comè":          "zone_lagunaire",  // Mono
    "Bembéréké":     "zone_nord",       // Borgou
    "Bassila":       "zone_nord_ouest", // Donga
    "Banikoara":     "zone_nord",       // Alibori
    "Kétou":         "zone_centre",     // Plateau
    "Dassa-Zoumè":   "zone_centre",     // Collines
    "Tchaourou":     "zone_nord",       // Borgou
    "Allada":        "zone_côtière",    // Atlantique
    "Aplahoué":      "zone_centre",     // Couffo
    "Tanguiéta":     "zone_nord_ouest", // Atacora
    "N'Dali":        "zone_nord",       // Borgou
    "Segbana":       "zone_nord",       // Alibori
    "Athiémé":       "zone_lagunaire",  // Mono
    "Grand-Popo":    "zone_côtière",    // Mono (façade atlantique)
    "Kouandé":       "zone_nord_ouest", // Atacora
  },
  zones: {
    zone_côtière: {
      label: "Zone côtière / sablonneuse",
      sol: "Sable fin côtier, nappe phréatique haute (0,5–2 m).",
      fondation: "Semelle filante élargie (L ≥ 60 cm, H ≥ 30 cm) ou radier général.",
      profondeur: "Minimum 1,20 m sous niveau fini.",
      dosage: "Béton 350 kg/m³ minimum. Imperméabilisant obligatoire.",
      alerte: "Nappe haute : prévoir imperméabilisation et drain périphérique.",
      // Terrassement (point 4, Lot B) : Cf = foisonnement (déblais → volume
      // évacué, camion) ; Cp = tassement/compactage (remblai compacté → volume
      // de matériau brut à commander). Cas d'usage direct du "sable à évacuer".
      terrassement: { sol: "Sable du cordon littoral", cf: 1.10, cp: 1.05, bloquant: false },
    },
    zone_lagunaire: {
      label: "Zone lagunaire / argileuse",
      sol: "Argile molle, vases, remblais hétérogènes. Portance faible.",
      fondation: "Radier général ou fondations sur pieux selon CBR. Éviter semelles isolées.",
      profondeur: "Minimum 1,50 m ou jusqu'au bon sol.",
      dosage: "Béton 350 kg/m³ avec adjuvant hydrofuge.",
      alerte: "Sol compressible : tassements différentiels probables. Étude obligatoire.",
      // bloquant: true → purge totale (évacuation) + apport extérieur obligatoires,
      // conforme à validation.js. Seule zone avec ce sol dans la classification actuelle.
      terrassement: { sol: "Argiles noires / Vases", cf: 1.35, cp: null, bloquant: true },
    },
    zone_centre: {
      label: "Zone de plateau / argilo-latéritique",
      sol: "Argile latéritique, portance moyenne à bonne (CBR 5–15 %).",
      fondation: "Semelle filante standard (L 40 cm, H 20 cm) ou semelle élargie si CBR < 8.",
      profondeur: "0,80 à 1,20 m selon résultats sondage.",
      dosage: "Béton 350 kg/m³.",
      alerte: null,
      terrassement: { sol: "Terre de barre", cf: 1.25, cp: 1.15, bloquant: false },
    },
    zone_nord: {
      label: "Zone nord / socle granitique",
      sol: "Altérites, cuirasse latéritique, rocher à faible profondeur. Bonne portance.",
      fondation: "Semelle filante standard ou semelle sur rocher.",
      profondeur: "0,60 à 1,00 m (jusqu'au toit du rocher sain).",
      dosage: "Béton 250–300 kg/m³ en rocher, 350 kg/m³ en altérites.",
      alerte: null,
      terrassement: { sol: "Graveleux latéritique", cf: 1.20, cp: 1.30, bloquant: false },
    },
    zone_nord_ouest: {
      label: "Zone de l'Atacora / granitique et gréseux",
      sol: "Cuirasse ferrugineuse, quartzites, sols rocailleux. Très bonne portance.",
      fondation: "Semelle filante ancrée dans le rocher ou en cuirasse.",
      profondeur: "0,60 à 1,20 m.",
      dosage: "Béton 250 kg/m³ minimum.",
      alerte: "Relief accidenté : prévoir terrassement et murettes de soutènement.",
      terrassement: { sol: "Roche (à briser)", cf: 1.40, cp: 1.25, bloquant: false },
    },
  },
  // Table complète des coefficients par nature de sol (point 4, Lot B) —
  // au-delà du sol dominant par défaut de chaque zone ci-dessus, réutilisable
  // si une saisie manuelle du type de sol est ajoutée à l'interface plus tard.
  terrassementParSol: {
    "Sable / Gravier":              { cf: 1.15, cp: 1.10 },
    "Argile / Limon":                { cf: 1.30, cp: 1.20 },
    "Terre végétale":                { cf: 1.25, cp: 1.15 },
    "Roche (à briser)":              { cf: 1.40, cp: 1.25 },
    "Sable du cordon littoral":      { cf: 1.10, cp: 1.05 },
    "Terre de barre":                { cf: 1.25, cp: 1.15 },
    "Graveleux latéritique":         { cf: 1.20, cp: 1.30 },
    "Argiles noires / Vases":        { cf: 1.35, cp: null, bloquant: true },
  },
}
