// src/components/StatutBadge.jsx
// Pastille de statut du compte : solde de crédits CST (compte standard) ou Admin. Étiquette « Gratuit » en version gratuite.
import React from 'react'
import { Coins, Gift, ShieldCheck } from 'lucide-react'
import { Badge } from './ui/index.jsx'
import { APP_GRATUITE } from '../config/mode.js'
import { fmtCst } from '../lib/acces.js'

export default function StatutBadge({ statut, solde = 0, className = '' }) {
  if (statut === 'admin') return <Badge variant="ind" className={className}><ShieldCheck size={13} /> Admin</Badge>
  if (statut === 'gratuit') return <Badge variant="default" className={className}><Gift size={13} /> Gratuit</Badge>
  if (statut === 'standard') return <Badge variant="sol" className={className}><Coins size={13} /> {fmtCst(solde)}</Badge>
  return null
}

/** Petite étiquette « CST » à poser à côté d'une fonction qui consomme des crédits. */
export function EtiquetteCredits({ className = '' }) {
  if (APP_GRATUITE) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-soleil-soft text-soleil-deep border border-soleil/30 ${className}`}>
      <Coins size={10} /> CST
    </span>
  )
}
