// src/constants/ratiosAcier.js
// Constantes acier — extraites de lib/metre.js pour isoler les données de
// référence (poids linéique par diamètre, ratios par élément) de la logique
// de calcul. Réexportées par lib/metre.js pour ne rien casser côté composants.

// Poids linéique des aciers HA, en kg/m, par diamètre (mm).
export const ACIER = { 6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.208, 16: 1.578, 20: 2.466, 25: 3.853 }

// Ratios d'acier par élément, kg/m³ sauf hourdisM2 en kg/m² (A5).
export const RATIOS_ACIER_DEFAUT = {
  semelle: 50, chainage: 100, longrine: 100, radier: 80,
  poteau: 150, poutre: 130, linteau: 120,
  dallePleine: 90, dalleTP: 35, hourdisM2: 9,
}
