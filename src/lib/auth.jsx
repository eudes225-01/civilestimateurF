// src/lib/auth.jsx
// Session utilisateur (connexion Google via Supabase Auth).
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, comptesActifs } from './supabase.js'
import { api } from './api.js'

const AuthCtx = createContext({ actif: false, chargement: false, session: null, profil: null, connecterGoogle: async () => {}, deconnecter: async () => {} })
export const useAuth = () => useContext(AuthCtx)

function profilLocal(user) {
  if (!user) return null
  const m = user.user_metadata || {}
  const nomComplet = m.full_name || m.name || [m.given_name, m.family_name].filter(Boolean).join(' ') || user.email || ''
  return {
    email: user.email || '',
    prenom: m.given_name || nomComplet.split(' ')[0] || '',
    nom: m.family_name || nomComplet.split(' ').slice(1).join(' '),
    nomComplet,
    photo: m.avatar_url || m.picture || '',
    statut: 'standard',
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(comptesActifs)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!supabase) return undefined
    let annule = false
    supabase.auth.getSession().then(({ data }) => { if (!annule) { setSession(data.session); setProfil(profilLocal(data.session?.user)); setChargement(false) } })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => { setSession(s); setProfil(profilLocal(s?.user)) })
    return () => { annule = true; sub.subscription.unsubscribe() }
  }, [])

  // Mail de bienvenue : demandé une fois par session de navigateur ; le serveur ne l'envoie
  // qu'à la première connexion du compte et ignore les appels suivants.
  const bienvenueDemandee = useRef(null)
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return undefined
    let annule = false
    api.me().then((p) => { if (!annule && p) setProfil(p) }).catch(() => {})
    return () => { annule = true }
  }, [userId])
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
  const deconnecter = async () => { await supabase?.auth.signOut(); setProfil(null) }

  return (
    <AuthCtx.Provider value={{ actif: comptesActifs, chargement, session, profil, erreur, connecterGoogle, deconnecter }}>
      {children}
    </AuthCtx.Provider>
  )
}
