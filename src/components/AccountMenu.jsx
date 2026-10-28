// src/components/AccountMenu.jsx
// Coin supérieur droit : photo + nom du compte Google. Un clic ouvre le menu du compte :
// créer un projet, enregistrer, mes projets (ouvrir / supprimer), abonnement Premium,
// se déconnecter, supprimer mon compte.
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Save, FolderOpen, Plus, LogOut, Loader, Check, AlertTriangle, Trash2, X, Crown, ChevronDown, UserX, ShieldCheck, FileText, Pencil,
} from 'lucide-react'
import { listerProjets, supprimerProjet } from '../lib/projets.js'
import { api } from '../lib/api.js'
import { profilUtilisateur } from '../lib/auth.jsx'
import StatutBadge from './StatutBadge.jsx'
import { Button } from './ui/index.jsx'

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const MSG_RENVOI = {
  trop_tot: 'Une confirmation vient d\u2019être envoyée. Patientez deux minutes avant de réessayer.',
  aucun_paiement: 'Aucun paiement trouvé sur ce compte.',
  pdf_indisponible: 'Le PDF ne peut pas être généré pour le moment. Réessayez dans un instant.',
  trop_de_requetes: 'Trop de demandes. Réessayez dans quelques minutes.',
  defaut: 'Envoi impossible pour le moment. Réessayez dans un instant.',
}
const fmtJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Photo du compte ; initiales si elle manque ou ne se charge pas (referrerPolicy : les photos Google la refusent parfois). */
export function Avatar({ profil, size = 34 }) {
  const [casse, setCasse] = useState(false)
  const style = { width: size, height: size }
  if (profil.photo && !casse) {
    return <img src={profil.photo} alt="" referrerPolicy="no-referrer" onError={() => setCasse(true)} style={style} className="rounded-full object-cover border border-line bg-muted-bg" />
  }
  return <span style={{ ...style, fontSize: size * 0.38 }} className="rounded-full grid place-items-center bg-indigo text-white font-bold">{profil.initiales}</span>
}

export default function AccountMenu({ user, statut, finAbonnement, projetId, titre = '', etat, onSave, onOpen, onNew, onRename, onSignOut, onDeleteAccount, onPremium }) {
  const profil = profilUtilisateur(user)
  const [menu, setMenu] = useState(false)
  const [ouvert, setOuvert] = useState(false)          // fenêtre « Mes projets »
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')
  const [suppr, setSuppr] = useState(false)            // fenêtre « Supprimer mon compte »
  const [saisie, setSaisie] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreurCompte, setErreurCompte] = useState('')
  const [info, setInfo] = useState(null)              // retour de « Renvoyer ma confirmation » : { ton, t }
  const [nom, setNom] = useState(null)              // fenêtre « Nom du projet » : { mode: 'creer' | 'enregistrer' | 'renommer', valeur }
  const [editId, setEditId] = useState(null)         // projet en cours de renommage dans « Mes projets »
  const [editVal, setEditVal] = useState('')
  const ref = useRef(null)

  // Fermeture du menu au clic à l'extérieur ou sur Échap.
  useEffect(() => {
    if (!menu) return undefined
    const clic = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false) }
    const touche = (e) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', clic); document.addEventListener('keydown', touche)
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', touche) }
  }, [menu])

  const ouvrir = async () => {
    setMenu(false); setOuvert(true); setListe(null); setErreur(''); setEditId(null)
    try { setListe(await listerProjets()) } catch (e) { setErreur(e.message) }
  }
  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer définitivement « ${p.titre} » ?`)) return
    try { await supprimerProjet(p.id); setListe((l) => l.filter((x) => x.id !== p.id)); if (p.id === projetId) onNew() } catch (e) { setErreur(e.message) }
  }
  const demanderNom = (mode, valeur = '') => { setMenu(false); setOuvert(false); setNom({ mode, valeur }) }
  const validerNom = async () => {
    if (!nom) return
    const v = nom.valeur.trim()
    if (nom.mode !== 'creer' && !v) return
    const { mode } = nom
    setNom(null)
    try {
      if (mode === 'creer') onNew(v)
      else if (mode === 'enregistrer') await onSave(v)
      else await onRename(projetId, v)
    } catch (e) { setInfo({ ton: 'err', t: e.message || 'Opération impossible pour le moment.' }); setTimeout(() => setInfo(null), 7000) }
  }
  const renommerDansListe = async (p) => {
    const v = editVal.trim()
    if (!v) return
    if (v === p.titre) { setEditId(null); return }
    try {
      await onRename(p.id, v)
      setListe((l) => l.map((x) => (x.id === p.id ? { ...x, titre: v } : x)))
      setEditId(null); setErreur('')
    } catch (e) { setErreur(e.message) }
  }
  const TITRES_NOM = { creer: 'Nouveau projet', enregistrer: 'Nommer et enregistrer le projet', renommer: 'Renommer le projet' }

  const confirmerSuppression = async () => {
    setEnCours(true); setErreurCompte('')
    try { await onDeleteAccount() } catch (e) {
      setErreurCompte(e.message === 'backend_requis' ? 'Suppression indisponible : le serveur n\u2019est pas configuré.' : 'La suppression a échoué. Réessayez dans un instant.')
      setEnCours(false)
    }
  }

  const renvoyerConfirmation = async () => {
    setMenu(false); setInfo({ ton: 'wait', t: 'Envoi de votre confirmation…' })
    let retour
    try {
      const r = await api.renvoyerConfirmation()
      retour = r ? { ton: 'ok', t: `Confirmation envoyée à ${r.email || profil.email || 'votre adresse e-mail'}.` } : { ton: 'err', t: 'Envoi indisponible : le serveur n\u2019est pas configuré.' }
    } catch (e) {
      retour = { ton: 'err', t: MSG_RENVOI[e?.error] || MSG_RENVOI.defaut }
    }
    setInfo(retour)
    setTimeout(() => setInfo(null), 7000)
  }

  const statutSauv = etat === 'saving' ? { Ic: Loader, t: 'Enregistrement…', cls: 'text-muted', spin: true }
    : etat === 'saved' ? { Ic: Check, t: 'Enregistré', cls: 'text-jade-deep' }
    : etat === 'error' ? { Ic: AlertTriangle, t: 'Échec — réessayez', cls: 'text-laterite-deep' }
    : null

  const bouton = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold text-muted hover:text-ink hover:bg-muted-bg transition-colors'
  const item = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] font-medium text-ink hover:bg-muted-bg transition-colors text-left disabled:opacity-50'

  return (
    <>
      {statutSauv && <span className={`hidden sm:inline-flex items-center gap-1 text-[12px] ${statutSauv.cls}`}><statutSauv.Ic size={13} className={statutSauv.spin ? 'animate-spin' : ''} />{statutSauv.t}</span>}

      <div ref={ref} className="relative">
        <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-line bg-card hover:border-indigo transition-colors" title="Mon compte">
          <Avatar profil={profil} />
          <span className="hidden md:block max-w-[140px] truncate text-[12.5px] font-semibold">{profil.nomComplet}</span>
          {statut === 'premium' && <Crown size={13} className="text-soleil-deep" />}
          <ChevronDown size={14} className={`text-muted transition-transform ${menu ? 'rotate-180' : ''}`} />
        </button>

        {menu && (
          <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[290px] rounded-xl2 bg-card border border-line shadow-card p-2 animate-fade-in">
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar profil={profil} size={46} />
              <div className="min-w-0">
                <p className="truncate font-display font-bold text-[14px]">{profil.nomComplet}</p>
                {profil.email && <p className="truncate text-[11.5px] text-muted">{profil.email}</p>}
                <div className="mt-1"><StatutBadge statut={statut} /></div>
              </div>
            </div>
            {statut === 'premium' && finAbonnement && <p className="px-3 pb-2 text-[11.5px] text-muted">Premium actif jusqu'au {fmtJour(finAbonnement)}</p>}
            {statut === 'admin' && <p className="px-3 pb-2 text-[11.5px] text-muted flex items-center gap-1.5"><ShieldCheck size={12} /> Accès complet à toutes les fonctionnalités</p>}

            <div className="border-t border-line my-1" />
            <p className="px-3 pt-1 pb-1.5 text-[11.5px] text-muted truncate">Projet en cours : <b className="text-ink">{titre.trim() || 'sans nom'}</b></p>
            <button role="menuitem" className={item} onClick={() => demanderNom('creer')}><Plus size={15} /> Créer un projet</button>
            <button role="menuitem" className={item} onClick={() => demanderNom('renommer', titre)}><Pencil size={15} /> Renommer le projet</button>
            <button role="menuitem" className={item} disabled={etat === 'saving'}
              onClick={() => { if (titre.trim()) { setMenu(false); onSave() } else demanderNom('enregistrer') }}><Save size={15} /> {projetId ? 'Enregistrer' : 'Enregistrer le projet'}</button>
            <button role="menuitem" className={item} onClick={ouvrir}><FolderOpen size={15} /> Mes projets <span className="ml-auto text-[11px] text-muted">ouvrir · supprimer</span></button>
            {statut !== 'admin' && statut !== 'local' && (
              <button role="menuitem" className={`${item} text-soleil-deep`} onClick={() => { setMenu(false); onPremium() }}>
                <Crown size={15} /> {statut === 'premium' ? 'Mon abonnement Premium' : 'Passer Premium'}
              </button>
            )}

            {statut === 'premium' && (
              <button role="menuitem" className={item} onClick={renvoyerConfirmation}>
                <FileText size={15} /> Renvoyer ma confirmation <span className="ml-auto text-[11px] text-muted">PDF par e-mail</span>
              </button>
            )}

            <div className="border-t border-line my-1" />
            <button role="menuitem" className={item} onClick={() => { setMenu(false); onSignOut() }}><LogOut size={15} /> Se déconnecter</button>
            <button role="menuitem" className={`${item} text-laterite-deep hover:bg-laterite-soft`} onClick={() => { setMenu(false); setSaisie(''); setErreurCompte(''); setSuppr(true) }}><UserX size={15} /> Supprimer mon compte</button>
          </div>
        )}
      </div>

      {createPortal(<>
      {info && (
        <div role="status" className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] flex items-center gap-2 rounded-xl2 border bg-card shadow-card px-4 py-2.5 text-[13px] ${info.ton === 'err' ? 'border-laterite/50 text-laterite-deep' : info.ton === 'ok' ? 'border-jade/50 text-jade-deep' : 'border-line text-muted'}`}>
          {info.ton === 'wait' ? <Loader size={14} className="animate-spin" /> : info.ton === 'ok' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {info.t}
        </div>
      )}

      {ouvert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-label="Mes projets" className="w-full max-w-[460px] max-h-[85vh] overflow-auto rounded-xl2 bg-card border border-line shadow-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-[16px] flex-1">Mes projets</h2>
              <button onClick={() => demanderNom('creer')} className={bouton}><Plus size={14} /> Nouveau</button>
              <button onClick={() => setOuvert(false)} className="p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={16} /></button>
            </div>
            {erreur && <p className="mt-3 text-[12.5px] text-laterite-deep">{erreur}</p>}
            {!liste && !erreur && <p className="mt-4 text-[13px] text-muted flex items-center gap-2"><Loader size={14} className="animate-spin" /> Chargement…</p>}
            {liste && liste.length === 0 && <p className="mt-4 text-[13px] text-muted">Aucun projet enregistré pour l'instant.</p>}
            {liste && liste.length > 0 && (
              <ul className="mt-3 grid gap-1.5">
                {liste.map((p) => (
                  <li key={p.id} className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 ${p.id === projetId ? 'border-indigo bg-indigo-soft/40' : 'border-line'}`}>
                    {editId === p.id ? (
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <input autoFocus value={editVal} maxLength={120} onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renommerDansListe(p); if (e.key === 'Escape') setEditId(null) }}
                          aria-label="Nouveau nom du projet"
                          className="flex-1 min-w-0 rounded-[8px] border border-line-strong bg-card px-2 py-1 text-[13.5px] outline-none focus:border-indigo" />
                        <button onClick={() => renommerDansListe(p)} disabled={!editVal.trim()} className="p-1 text-jade-deep hover:text-jade disabled:opacity-40" title="Valider le nom"><Check size={15} /></button>
                        <button onClick={() => setEditId(null)} className="p-1 text-muted hover:text-ink" title="Annuler"><X size={15} /></button>
                      </div>
                    ) : (
                      <>
                        <button className="flex-1 min-w-0 text-left" onClick={() => { onOpen(p.id); setOuvert(false) }}>
                          <span className="block truncate text-[13.5px] font-semibold">{p.titre}</span>
                          <span className="block text-[11.5px] text-muted">Modifié le {fmtDate(p.modifie_le)}</span>
                        </button>
                        <button onClick={() => { setEditId(p.id); setEditVal(p.titre) }} className="text-muted hover:text-indigo p-1" title="Renommer ce projet"><Pencil size={14} /></button>
                      </>
                    )}
                    <button onClick={() => supprimer(p)} className="text-muted hover:text-laterite p-1" title="Supprimer ce projet"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {suppr && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={() => !enCours && setSuppr(false)}>
          <div role="alertdialog" aria-label="Supprimer mon compte" className="w-full max-w-[440px] rounded-xl2 bg-card border border-laterite/30 shadow-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-laterite-deep">
              <UserX size={20} /><h2 className="font-display font-bold text-[17px]">Supprimer mon compte</h2>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed">
              Cette action est <b>définitive</b>. Votre compte, tous vos projets enregistrés et votre abonnement{statut === 'premium' ? ' Premium (même s\u2019il reste des jours à courir, sans remboursement)' : ''} seront effacés.
            </p>
            <label className="block mt-4 text-[12.5px] text-muted">Tapez <b className="text-ink">SUPPRIMER</b> pour confirmer</label>
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} autoFocus disabled={enCours}
              className="mt-1.5 w-full rounded-[10px] border border-line-strong bg-card px-3 py-2 text-[14px] outline-none focus:border-laterite" placeholder="SUPPRIMER" />
            {erreurCompte && <p role="alert" className="mt-3 text-[12.5px] text-laterite-deep">{erreurCompte}</p>}
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setSuppr(false)} disabled={enCours}>Annuler</Button>
              <button onClick={confirmerSuppression} disabled={saisie.trim() !== 'SUPPRIMER' || enCours}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[11px] text-[13.5px] font-semibold text-white bg-laterite-deep hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none">
                {enCours ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {nom && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 px-4" onClick={() => setNom(null)}>
          <div role="dialog" aria-label={TITRES_NOM[nom.mode]} className="w-full max-w-[420px] rounded-xl2 bg-card border border-line shadow-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-[16px] flex-1">{TITRES_NOM[nom.mode]}</h2>
              <button onClick={() => setNom(null)} className="p-1 text-muted hover:text-ink" aria-label="Fermer"><X size={16} /></button>
            </div>
            <label className="block mt-4 text-[12.5px] font-semibold text-muted" htmlFor="nom-projet">Nom du projet</label>
            <input id="nom-projet" autoFocus value={nom.valeur} maxLength={120}
              onChange={(e) => setNom({ ...nom, valeur: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') validerNom(); if (e.key === 'Escape') setNom(null) }}
              placeholder="Ex. : Villa R+1 – Cotonou"
              className="mt-1.5 w-full rounded-[10px] border border-line-strong bg-card px-3 py-2 text-[14px] outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/25" />
            {nom.mode === 'creer' && <p className="mt-2 text-[12px] text-muted">Facultatif : vous pourrez aussi le nommer plus tard, dans « Renommer le projet ».</p>}
            {nom.mode === 'enregistrer' && <p className="mt-2 text-[12px] text-muted">Ce nom apparaîtra dans « Mes projets ».</p>}
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNom(null)}>Annuler</Button>
              <Button onClick={validerNom} disabled={nom.mode !== 'creer' && !nom.valeur.trim()}>
                {nom.mode === 'creer' ? 'Créer' : nom.mode === 'enregistrer' ? 'Enregistrer' : 'Renommer'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </>, document.body)}
    </>
  )
}
