// src/components/Logo.jsx
// Marque CivilEstimator : un bâtiment mesuré (toit + murs + ligne de cote),
// sur tuile dégradée indigo → latérite → soleil. Volontairement non neutre.
import React from 'react'

export function LogoMark({ size = 40, className = '', glow = false }) {
  const id = React.useId().replace(/:/g, '')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={`${glow ? 'drop-shadow-[0_8px_18px_rgba(30,42,120,0.45)]' : ''} ${className}`}
      role="img"
      aria-label="CivilEstimator"
    >
      <defs>
        <linearGradient id={`grad${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e2a78" />
          <stop offset="0.52" stopColor="#e0532f" />
          <stop offset="1" stopColor="#f6a823" />
        </linearGradient>
      </defs>

      {/* tuile */}
      <rect x="2" y="2" width="40" height="40" rx="11" fill={`url(#grad${id})`} />
      {/* liseré interne */}
      <rect x="2" y="2" width="40" height="40" rx="11" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.2" />

      {/* toit */}
      <path d="M11 21 L22 11.5 L33 21" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* murs */}
      <path d="M14 20 V31 H30 V20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* ouverture */}
      <rect x="19.4" y="24.5" width="5.2" height="6.5" rx="0.8" fill="#fff" fillOpacity="0.95" />

      {/* ligne de cote (métré) */}
      <g stroke="#fff" strokeOpacity="0.92" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 35.4 H32" />
        <path d="M12 33.7 V37.1 M32 33.7 V37.1" />
      </g>
    </svg>
  )
}

export function LogoWord({ className = '', sub = true }) {
  return (
    <div className={`text-left leading-tight ${className}`}>
      <b className="font-display text-[16px] tracking-tight">
        Civil<span className="text-laterite">Estimator</span>
      </b>
      {sub && <span className="block text-[10.5px] text-muted">Métré &amp; DQE · Bénin</span>}
    </div>
  )
}
