// src/config/video.js
// Vidéo tutoriel affichée avant les dépôts de plans : comment créer un fichier IFC depuis son
// logiciel (ArchiCAD, Revit…). À CHANGER ICI, ou sans toucher au code via la variable
// d'environnement VITE_VIDEO_IFC_URL (voir .env.example). Vide = la vidéo n'est pas affichée.
//
// Liens acceptés :
//  • YouTube  : https://www.youtube.com/watch?v=XXXX  ou  https://youtu.be/XXXX
//  • Vimeo    : https://vimeo.com/123456789
//  • Fichier  : https://…/video.mp4  (ou .webm / .ogg) — hébergé par vous
// Format : paysage 16:9, quel que soit l'écran.
export const VIDEO_IFC_URL = import.meta.env.VITE_VIDEO_IFC_URL || ''
export const VIDEO_IFC_TITRE = 'Créer un fichier IFC depuis votre logiciel'
