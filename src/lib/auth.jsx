// src/lib/auth.jsx
// Session utilisateur (connexion Google via Supabase Auth).
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, comptesActifs } from './supabase.js'
import { api } from './api.js'

const AuthCtx = createContext({ actif: false, chargement: false, session: null, connecterGoogle: async () => {}, deconnecter: async () => {} })
export const useAuth = () => useContext(AuthCtx)

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

  return (
    <AuthCtx.Provider value={{ actif: comptesActifs, chargement, session, erreur, connecterGoogle, deconnecter }}>
      {children}
    </AuthCtx.Provider>
  )
}
