// src/lib/auth.jsx
// Session utilisateur (connexion Google via Supabase Auth).
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, comptesActifs } from './supabase.js'
import { api, backendActif } from './api.js'

const AuthCtx = createContext({ actif: false, chargement: false, session: null, connecterGoogle: async () => {}, deconnecter: async () => {}, supprimerCompte: async () => {} })
export const useAuth = () => useContext(AuthCtx)

/**
 * Identité affichable de l'utilisateur, lue dans les métadonnées Google (nom, prénom, photo).
 * Google ne renvoie pas toujours given_name / family_name : à défaut, le nom complet est scindé
 * (premier mot = prénom, reste = nom).
 */
export function profilUtilisateur(user) {
  const m = user?.user_metadata || {}
  const complet = String(m.full_name || m.name || '').trim()
  let prenom = String(m.given_name || '').trim()
  let nom = String(m.family_name || '').trim()
  if (!prenom && !nom && complet) {
    const [p, ...r] = complet.split(/\s+/)
    prenom = p; nom = r.join(' ')
  }
  const email = user?.email || ''
  const nomComplet = complet || [prenom, nom].filter(Boolean).join(' ') || email.split('@')[0] || 'Utilisateur'
  const initiales = ([prenom, nom].filter(Boolean).map((x) => x[0]).join('') || nomComplet.slice(0, 2)).toUpperCase().slice(0, 2)
  return { prenom, nom, nomComplet, email, photo: m.avatar_url || m.picture || '', initiales }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [chargement, setChargement] = useState(comptesActifs)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!supabase) return undefined
    let annule = false
    supabase.auth.getSession().then(({ data }) => { if (!annule) { setSession(data.session); setChargement(false) } })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => { annule = true; sub.subscription.unsubscribe() }
  }, [])

  // Mail de bienvenue : demandé une fois par session de navigateur ; le serveur ne l'envoie
  // qu'à la première connexion du compte et ignore les appels suivants.
  const bienvenueDemandee = useRef(null)
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId || bienvenueDemandee.current === userId) return
    bienvenueDemandee.current = userId
    api.bienvenue().catch(() => {}) // jamais bloquant pour l'utilisateur
  }, [userId])

  const connecterGoogle = async () => {
    setErreur('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setErreur(error.message)
  }
  const deconnecter = async () => { await supabase?.auth.signOut() }
  // Suppression définitive : le serveur efface le compte (et ses données), puis on ferme la session locale.
  const supprimerCompte = async () => {
    if (!backendActif) throw new Error('backend_requis')
    const r = await api.supprimerCompte()
    if (!r?.supprime) throw new Error('suppression_impossible')
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => {})
  }

  return (
    <AuthCtx.Provider value={{ actif: comptesActifs, chargement, session, erreur, connecterGoogle, deconnecter, supprimerCompte }}>
      {children}
    </AuthCtx.Provider>
  )
}
