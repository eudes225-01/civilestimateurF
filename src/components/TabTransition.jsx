// src/components/TabTransition.jsx
// Transition de chargement (5 s) jouée à chaque passage d'un onglet à un autre.
import React, { useEffect, useState } from 'react'
import { LogoMark } from './Logo.jsx'

const ETAPES = [
  'Préparation du module…',
  'Chargement de la base de prix…',
  'Initialisation du calcul automatique…',
  'Application des formules de métré…',
  'Finalisation…',
]

export default function TabTransition({ label = '', color = 'indigo' }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % ETAPES.length), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-paper/85 backdrop-blur-md animate-fade-in" role="status" aria-live="polite">
      {/* halo */}
      <div className="absolute w-[340px] h-[340px] rounded-full bg-gradient-to-br from-indigo/15 via-laterite/10 to-soleil/15 blur-3xl animate-pulse" />

      <div className="relative w-full max-w-[340px] px-8 text-center">
        <div className="mx-auto mb-5 w-fit animate-float">
          <LogoMark size={66} glow />
        </div>

        <p className="font-display font-bold text-[17px]">
          Ouverture — <span className={`text-${color}`}>{label}</span>
        </p>
        <p className="text-muted text-[13px] mt-1 min-h-[18px] transition-all">{ETAPES[i]}</p>

        {/* barre de progression 5 s */}
        <div className="mt-5 h-2 rounded-full bg-muted-bg overflow-hidden border border-line">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo via-laterite to-soleil origin-left animate-[progress5_5s_linear_forwards]" />
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted tracking-wide">Calcul automatique en cours</p>
      </div>

      <style>{`
        @keyframes progress5 { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[progress5_5s_linear_forwards\\] { animation-duration: 0.3s !important; }
        }
      `}</style>
    </div>
  )
}
