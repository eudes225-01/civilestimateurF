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

// Téléphone (compactMobile) : 5 formes seulement, bien espacées, dans la moitié haute de l'écran
// (les pourcentages du bureau se chevauchent sur un écran étroit).
const MOBILE = [
  'top-[3%] right-[7%] w-14 h-14 rounded-xl border-2 border-white/25 animate-float',
  'top-[19%] left-[3%] w-9 h-9 rounded-lg bg-soleil/25 animate-float-slow',
  'top-[33%] right-[4%] w-10 h-10 rounded-full border-2 border-white/25 animate-float-slow',
  'top-[47%] left-[9%] w-12 h-12 rounded-2xl border-2 border-soleil/40 animate-float',
  'top-[27%] left-[46%] w-7 h-7 rounded-md bg-white/15 animate-float-slow',
]

export default function HeroDecor({ dense = false, compactMobile = false }) {
  return (
    <>
      <div className="absolute inset-0 blueprint-grid opacity-40 animate-grid-pan pointer-events-none" />
      {[...BASE, ...(dense ? DENSE : [])].map((c) => (
        <div key={c} className={`absolute ${c} pointer-events-none ${compactMobile ? 'hidden md:block' : ''}`} aria-hidden="true" />
      ))}
      {compactMobile && MOBILE.map((c) => (
        <div key={c} className={`absolute ${c} pointer-events-none md:hidden`} aria-hidden="true" />
      ))}
    </>
  )
}
