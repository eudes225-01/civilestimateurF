// src/components/StatutBadge.jsx
// Pastille de statut du compte : Standard (gratuit), Premium (abonné) ou Admin.
import React from 'react'
import { Crown, ShieldCheck, User } from 'lucide-react'
import { Badge } from './ui/index.jsx'

export default function StatutBadge({ statut, className = '' }) {
  if (statut === 'admin') return <Badge variant="ind" className={className}><ShieldCheck size={13} /> Admin</Badge>
  if (statut === 'premium') return <Badge variant="sol" className={className}><Crown size={13} /> Premium</Badge>
  if (statut === 'standard') return <Badge variant="default" className={className}><User size={13} /> Standard</Badge>
  return null
}

/** Petite étiquette « Premium » à poser à côté d'une fonction verrouillée. */
export function EtiquettePremium({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-soleil-soft text-soleil-deep border border-soleil/30 ${className}`}>
      <Crown size={10} /> Premium
    </span>
  )
}
