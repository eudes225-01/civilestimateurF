// src/components/ProjetsMenu.jsx
// Barre « compte & projets » de l'en-tête : enregistrer, rouvrir, supprimer, nouveau, déconnexion.
import React, { useState } from 'react'
import { Save, FolderOpen, Plus, LogOut, Loader, Check, AlertTriangle, Trash2, X } from 'lucide-react'
import { listerProjets, supprimerProjet } from '../lib/projets.js'

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function ProjetsMenu({ email, projetId, etat, onSave, onOpen, onNew, onSignOut }) {
  const [ouvert, setOuvert] = useState(false)
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')

  const ouvrir = async () => {
    setOuvert(true); setListe(null); setErreur('')
    try { setListe(await listerProjets()) } catch (e) { setErreur(e.message) }
  }
  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer définitivement « ${p.titre} » ?`)) return
    try { await supprimerProjet(p.id); setListe((l) => l.filter((x) => x.id !== p.id)); if (p.id === projetId) onNew() } catch (e) { setErreur(e.message) }
  }

  const statut = etat === 'saving' ? { Ic: Loader, t: 'Enregistrement…', cls: 'text-muted', spin: true }
    : etat === 'saved' ? { Ic: Check, t: 'Enregistré', cls: 'text-jade-deep' }
    : etat === 'error' ? { Ic: AlertTriangle, t: 'Échec — réessayez', cls: 'text-laterite-deep' }
    : null

  const bouton = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold text-muted hover:text-ink hover:bg-muted-bg transition-colors'
  return (
    <>
      {statut && <span className={`hidden sm:inline-flex items-center gap-1 text-[12px] ${statut.cls}`}><statut.Ic size={13} className={statut.spin ? 'animate-spin' : ''} />{statut.t}</span>}
      <button onClick={onSave} disabled={etat === 'saving'} className={bouton} title={projetId ? 'Enregistrer maintenant' : 'Enregistrer ce projet'}><Save size={15} /><span className="hidden sm:inline">{projetId ? 'Enregistrer' : 'Enregistrer le projet'}</span></button>
      <button onClick={ouvrir} className={bouton} title="Mes projets"><FolderOpen size={15} /><span className="hidden sm:inline">Mes projets</span></button>
      <button onClick={onSignOut} className="text-muted hover:text-laterite transition-colors p-1.5 rounded-lg hover:bg-laterite-soft" title={`Se déconnecter${email ? ` (${email})` : ''}`}><LogOut size={17} /></button>

      {ouvert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-label="Mes projets" className="w-full max-w-[460px] max-h-[80vh] overflow-auto rounded-xl2 bg-card border border-line shadow-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-[16px] flex-1">Mes projets</h2>
              <button onClick={() => { onNew(); setOuvert(false) }} className={bouton}><Plus size={14} /> Nouveau</button>
              <button onClick={() => setOuvert(false)} className="p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={16} /></button>
            </div>
            {erreur && <p className="mt-3 text-[12.5px] text-laterite-deep">{erreur}</p>}
            {!liste && !erreur && <p className="mt-4 text-[13px] text-muted flex items-center gap-2"><Loader size={14} className="animate-spin" /> Chargement…</p>}
            {liste && liste.length === 0 && <p className="mt-4 text-[13px] text-muted">Aucun projet enregistré pour l'instant.</p>}
            {liste && liste.length > 0 && (
              <ul className="mt-3 grid gap-1.5">
                {liste.map((p) => (
                  <li key={p.id} className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 ${p.id === projetId ? 'border-indigo bg-indigo-soft/40' : 'border-line'}`}>
                    <button className="flex-1 min-w-0 text-left" onClick={() => { onOpen(p.id); setOuvert(false) }}>
                      <span className="block truncate text-[13.5px] font-semibold">{p.titre}</span>
                      <span className="block text-[11.5px] text-muted">Modifié le {fmtDate(p.modifie_le)}</span>
                    </button>
                    <button onClick={() => supprimer(p)} className="text-muted hover:text-laterite p-1" title="Supprimer"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
