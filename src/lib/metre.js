// src/lib/metre.js
// Compatibilité — ce fichier ne contient plus de logique de calcul.
//
// Le moteur (métré, DQE, sous-détail, validations, recommandations Lot A)
// vit désormais dans civilestimateur-engine (dépendance Git vers
// civilestimateurB), source de vérité unique partagée avec le backend.
// Avant cette bascule, ce fichier contenait une copie ESM du moteur
// maintenue en parallèle d'une copie CommonJS côté backend, avec un risque
// réel de divergence silencieuse entre les deux applications (voir le
// README de civilestimateur-engine). Ce fichier ne sert plus qu'à ne pas
// casser les imports existants (`from '../lib/metre.js'`) dans les
// composants : il réexporte tel quel tout ce que fournit le moteur partagé.
//
// N'ajoutez plus rien ici — toute évolution du moteur se fait dans
// civilestimateurB (src/), pas dans ce fichier.
export * from 'civilestimateur-engine'
