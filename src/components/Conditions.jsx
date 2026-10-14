// src/components/Conditions.jsx
// Fenêtre « Conditions d'utilisation » : texte complet (src/data/politiques.js), ouvrable depuis l'accueil,
// le pied de page et la fenêtre d'abonnement.
import React from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/index.jsx'
import { POLITIQUES_SECTIONS, POLITIQUES_VERSION, POLITIQUES_DATE, CONTACT_EMAIL } from '../data/politiques.js'

export default function Conditions({ ouvert, onFermer }) {
  if (!ouvert) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 px-4 py-6 overflow-auto" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Conditions d'utilisation"
        className="relative w-full max-w-[640px] max-h-full overflow-auto rounded-xl2 bg-card border border-line shadow-card p-6"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onFermer} className="absolute top-3 right-3 p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={17} /></button>
        <h2 className="font-display font-bold text-[20px]">Conditions d'utilisation</h2>
        <p className="mt-1 text-[12px] text-muted">Version {POLITIQUES_VERSION} · mise à jour le {POLITIQUES_DATE}</p>
        <div className="mt-4 space-y-4">
          {POLITIQUES_SECTIONS.map((s) => (
            <section key={s.t}>
              <h3 className="font-semibold text-[13.5px]">{s.t}</h3>
              <p className="mt-1 text-[13px] text-muted leading-relaxed">{s.c}</p>
            </section>
          ))}
          {CONTACT_EMAIL && (
            <section>
              <h3 className="font-semibold text-[13.5px]">11. Contact</h3>
              <p className="mt-1 text-[13px] text-muted leading-relaxed">
                Une question, un paiement à vérifier, une demande sur vos données : <a className="underline text-indigo" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </section>
          )}
        </div>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onFermer}>Fermer</Button>
      </div>
    </div>
  )
}
