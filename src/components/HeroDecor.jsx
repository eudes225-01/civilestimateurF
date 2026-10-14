// src/components/HeroDecor.jsx
// Fond animé de la bannière d'accueil (dégradé, grille de plans, rectangles qui flottent et tournent).
// Posé comme premier enfant d'un conteneur `relative overflow-hidden gradient-hero animate-drift` ;
// le contenu doit être `relative` pour passer devant. `dense` ajoute des formes pour remplir un écran entier.
import React from 'react'

const BASE = [
  'top-10 right-[8%] w-24 h-24 rounded-2xl border-2 border-white/20 rotate-12 animate-float',
  'bottom-12 right-[22%] w-14 h-14 rounded-xl bg-soleil/25 animate-float-slow',
  'top-1/2 left-[6%] w-16 h-16 rounded-full border-2 border-white/15 animate-float-slow',
  'bottom-8 left-[20%] w-10 h-10 rounded-lg bg-white/10 rotate-45 animate-float',
]

// Formes supplémentaires réparties sur tout l'écran (page de connexion).
const DENSE = [
  'top-[6%] left-[10%] w-20 h-20 rounded-2xl border-2 border-white/20 -rotate-12 animate-float-slow',
  'top-[14%] left-[42%] w-12 h-12 rounded-xl bg-white/10 rotate-12 animate-float',
  'top-[8%] right-[30%] w-16 h-16 rounded-xl border-2 border-soleil/40 rotate-45 animate-float',
  'top-[38%] right-[6%] w-14 h-14 rounded-lg bg-soleil/20 -rotate-12 animate-float-slow',
  'top-[62%] left-[34%] w-24 h-24 rounded-2xl border-2 border-white/15 rotate-6 animate-float',
  'bottom-[10%] right-[8%] w-20 h-20 rounded-2xl bg-white/10 -rotate-6 animate-float-slow',
  'bottom-[26%] left-[8%] w-12 h-12 rounded-xl border-2 border-white/20 rotate-12 animate-float',
  'bottom-[5%] left-[46%] w-16 h-16 rounded-lg bg-soleil/20 rotate-45 animate-float-slow',
]

export default function HeroDecor({ dense = false }) {
  return (
    <>
      <div className="absolute inset-0 blueprint-grid opacity-40 animate-grid-pan pointer-events-none" />
      {[...BASE, ...(dense ? DENSE : [])].map((c) => (
        <div key={c} className={`absolute ${c} pointer-events-none`} aria-hidden="true" />
      ))}
    </>
  )
}
