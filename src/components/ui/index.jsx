// src/components/ui/index.jsx
// Primitives UI — version vivante & colorée
import React from 'react'

/* ── Button ─────────────────────────────────────────────────────────────────── */
const BTN = {
  primary: 'bg-indigo text-white hover:bg-indigo-deep shadow-soft',
  accent:  'text-white shadow-glow-lat bg-gradient-to-br from-laterite to-soleil hover:brightness-105',
  jade:    'bg-jade text-white hover:bg-jade-deep shadow-soft',
  ghost:   'text-muted hover:text-ink hover:bg-muted-bg',
  outline: 'border border-line-strong text-ink bg-card hover:border-indigo hover:text-indigo',
}
const SZ = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2 text-[13.5px]',
  lg: 'px-5 py-2.5 text-[14px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-[11px] transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${BTN[variant] ?? BTN.primary} ${SZ[size] ?? SZ.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
export function Card({ className = '', hover = false, accent, children, ...props }) {
  const top = accent
    ? `before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-${accent} before:rounded-t-xl2`
    : ''
  return (
    <div
      className={`relative bg-card border border-line rounded-xl2 shadow-card overflow-hidden ${top} ${
        hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-glow' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Input ──────────────────────────────────────────────────────────────────── */
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 text-[13.5px] border border-line-strong rounded-[10px] bg-card focus:outline-none focus:ring-2 focus:ring-indigo/25 focus:border-indigo transition ${className}`}
      {...props}
    />
  )
}

/* ── Select ─────────────────────────────────────────────────────────────────── */
export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 text-[13.5px] border border-line-strong rounded-[10px] bg-card focus:outline-none focus:ring-2 focus:ring-indigo/25 focus:border-indigo transition ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

/* ── Label ──────────────────────────────────────────────────────────────────── */
export function Label({ className = '', children, ...props }) {
  return (
    <label className={`block text-[12.5px] font-semibold text-muted mb-1 ${className}`} {...props}>
      {children}
    </label>
  )
}

/* ── Hint ───────────────────────────────────────────────────────────────────── */
export function Hint({ className = '', children }) {
  return <p className={`text-[12px] text-muted mt-1 ${className}`}>{children}</p>
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
const BADGE = {
  default: 'bg-muted-bg text-muted border-line',
  lat:     'bg-laterite-soft text-laterite-deep border-laterite/25',
  ind:     'bg-indigo-soft text-indigo border-indigo/20',
  sol:     'bg-soleil-soft text-soleil-deep border-soleil/30',
  ok:      'bg-jade-soft text-jade-deep border-jade/25',
  lag:     'bg-lagune-soft text-lagune-deep border-lagune/25',
}

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-semibold ${BADGE[variant] ?? BADGE.default} ${className}`}>
      {children}
    </span>
  )
}

/* ── SectionTitle ───────────────────────────────────────────────────────────── */
export function SectionTitle({ children, className = '', accent = 'laterite' }) {
  return (
    <h2 className={`text-[18px] font-bold tracking-tight mb-4 flex items-center gap-2.5 ${className}`}>
      <span className={`inline-block w-1.5 h-5 rounded-full bg-${accent}`} />
      {children}
    </h2>
  )
}

/* ── Separator ──────────────────────────────────────────────────────────────── */
export function Separator({ className = '' }) {
  return <hr className={`border-line my-4 ${className}`} />
}
