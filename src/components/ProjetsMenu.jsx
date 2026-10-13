// Menu du compte : profil Google, statut d'accès et gestion des projets.
import React, { useState } from 'react'
import { Save, FolderOpen, Plus, LogOut, Loader, Check, AlertTriangle, Trash2, X, ChevronDown, Crown, ShieldCheck, UserRound } from 'lucide-react'
import { listerProjets, supprimerProjet } from '../lib/projets.js'

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const badgeStatut = (statut) => statut === 'admin'
  ? { libelle: 'Administrateur', cls: 'bg-indigo-soft text-indigo', Ic: ShieldCheck }
  : statut === 'premium'
    ? { libelle: 'Premium', cls: 'bg-soleil-soft text-soleil-deep', Ic: Crown }
    : { libelle: 'Standard', cls: 'bg-muted-bg text-muted', Ic: UserRound }

export default function ProjetsMenu({ profil, email, abonnement, projetId, etat, onSave, onOpen, onNew, onDeleteCurrent, onDeleteAccount, onSignOut }) {
  const [ouvert, setOuvert] = useState(false)
  const [projetsOuverts, setProjetsOuverts] = useState(false)
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')
  // L'état d'accès est relu après le retour du paiement : il doit primer sur le profil chargé à la connexion.
  const statut = badgeStatut(abonnement?.statut || profil?.statut || 'standard')
  const nom = profil?.prenom || profil?.nomComplet || email?.split('@')[0] || 'Mon compte'
  const initiale = nom.trim().charAt(0).toUpperCase() || 'U'
  const statutSauvegarde = etat === 'saving' ? { Ic: Loader, t: 'Enregistrement…', cls: 'text-muted', spin: true }
    : etat === 'saved' ? { Ic: Check, t: 'Enregistré', cls: 'text-jade-deep' }
    : etat === 'error' ? { Ic: AlertTriangle, t: 'Échec — réessayez', cls: 'text-laterite-deep' } : null
  const ligne = 'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-muted-bg transition-colors'

  const ouvrirProjets = async () => {
    setOuvert(false); setProjetsOuverts(true); setListe(null); setErreur('')
    try { setListe(await listerProjets()) } catch (e) { setErreur(e.message) }
  }
  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer définitivement « ${p.titre} » ?`)) return
    try { await supprimerProjet(p.id); setListe((l) => l.filter((x) => x.id !== p.id)); if (p.id === projetId) onNew() } catch (e) { setErreur(e.message) }
  }
  const supprimerActuel = async () => {
    if (!projetId || !window.confirm('Supprimer définitivement le projet en cours ?')) return
    try { await onDeleteCurrent(); setOuvert(false) } catch (e) { setErreur(e.message) }
  }

  const Avatar = ({ grand = false }) => profil?.photo
    ? <img src={profil.photo} alt="" className={`${grand ? 'w-9 h-9' : 'w-7 h-7'} rounded-full object-cover`} referrerPolicy="no-referrer" />
    : <span className={`${grand ? 'w-9 h-9' : 'w-7 h-7'} rounded-full grid place-items-center bg-indigo text-white ${grand ? '' : 'text-[12px]'} font-bold`}>{initiale}</span>

  return (
    <>
      {statutSauvegarde && <span className={`hidden md:inline-flex items-center gap-1 text-[12px] ${statutSauvegarde.cls}`}><statutSauvegarde.Ic size={13} className={statutSauvegarde.spin ? 'animate-spin' : ''} />{statutSauvegarde.t}</span>}
      <div className="relative">
        <button onClick={() => setOuvert((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-2 py-1.5 hover:border-indigo transition-colors" aria-expanded={ouvert} aria-label="Ouvrir le menu du compte">
          <Avatar />
          <span className="hidden sm:block max-w-[105px] truncate text-[12.5px] font-semibold">{nom}</span><ChevronDown size={14} className="text-muted" />
        </button>
        {ouvert && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] overflow-hidden rounded-xl2 border border-line bg-card shadow-card">
            <div className="px-3 py-3 border-b border-line"><div className="flex items-center gap-2.5"><Avatar grand /><div className="min-w-0"><p className="font-semibold text-[13px] truncate">{profil?.nomComplet || nom}</p><p className="text-[11px] text-muted truncate">{profil?.email || email}</p></div></div><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${statut.cls}`}><statut.Ic size={12} /> {statut.libelle}</span></div>
            <div className="py-1"><button className={ligne} onClick={() => { onNew(); setOuvert(false) }}><Plus size={15} className="text-indigo" /> Créer un projet</button><button className={ligne} onClick={() => { onSave(); setOuvert(false) }} disabled={etat === 'saving'}><Save size={15} className="text-jade-deep" /> Enregistrer le projet</button><button className={ligne} onClick={ouvrirProjets}><FolderOpen size={15} className="text-lagune-deep" /> Mes projets</button><button className={`${ligne} ${!projetId ? 'opacity-45 cursor-not-allowed' : 'text-laterite-deep'}`} onClick={supprimerActuel} disabled={!projetId}><Trash2 size={15} /> Supprimer ce projet</button></div>
            <div className="border-t border-line py-1"><button className={ligne} onClick={onSignOut}><LogOut size={15} /> Se déconnecter</button><button className={`${ligne} text-laterite-deep`} onClick={onDeleteAccount}><Trash2 size={15} /> Supprimer mon compte</button></div>
          </div>
        )}
      </div>
      {projetsOuverts && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={() => setProjetsOuverts(false)}><div role="dialog" aria-label="Mes projets" className="w-full max-w-[460px] max-h-[80vh] overflow-auto rounded-xl2 bg-card border border-line shadow-card p-4" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-2"><h2 className="font-display font-bold text-[16px] flex-1">Mes projets</h2><button onClick={() => { onNew(); setProjetsOuverts(false) }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold text-muted hover:text-ink hover:bg-muted-bg"><Plus size={14} /> Nouveau</button><button onClick={() => setProjetsOuverts(false)} className="p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={16} /></button></div>{erreur && <p className="mt-3 text-[12.5px] text-laterite-deep">{erreur}</p>}{!liste && !erreur && <p className="mt-4 text-[13px] text-muted flex items-center gap-2"><Loader size={14} className="animate-spin" /> Chargement…</p>}{liste && liste.length === 0 && <p className="mt-4 text-[13px] text-muted">Aucun projet enregistré pour l'instant.</p>}{liste?.length > 0 && <ul className="mt-3 grid gap-1.5">{liste.map((p) => <li key={p.id} className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 ${p.id === projetId ? 'border-indigo bg-indigo-soft/40' : 'border-line'}`}><button className="flex-1 min-w-0 text-left" onClick={() => { onOpen(p.id); setProjetsOuverts(false) }}><span className="block truncate text-[13.5px] font-semibold">{p.titre}</span><span className="block text-[11.5px] text-muted">Modifié le {fmtDate(p.modifie_le)}</span></button><button onClick={() => supprimer(p)} className="text-muted hover:text-laterite p-1" title="Supprimer"><Trash2 size={14} /></button></li>)}</ul>}</div></div>}
    </>
  )
}
