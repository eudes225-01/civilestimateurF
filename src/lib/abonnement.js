// src/lib/abonnement.js
// État d'abonnement de l'utilisateur connecté. Pas de formule gratuite : à partir de l'étape DQE,
// l'accès exige un abonnement actif. Le serveur reste l'autorité (il refuse le calcul, le PDF et
// l'analyse de plan sans abonnement) ; ce hook ne sert qu'à afficher le verrou et le paiement.
//
// Échoue « fermé » : si l'état ne peut pas être lu (réseau, serveur), l'accès reste verrouillé.
// Seule exception : aucun backend configuré (développement local) → pas de verrou.
import { useCallback, useEffect, useState } from 'react'
import { api, backendActif } from './api.js'

const MESSAGES = {
  auth_requise: 'Connectez-vous avec Google avant de vous abonner.',
  session_invalide: 'Votre session a expiré : reconnectez-vous.',
  fedapay_non_configure: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
  abonnements_non_configures: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
}
// Message affiché + code technique entre parenthèses (utile pour le support) ; le détail complet va dans la console.
function messageErreur(e) {
  console.error('[abonnement]', e, e?.detail || '')
  if (e instanceof TypeError) return 'Serveur injoignable. Vérifiez votre connexion et réessayez. (réseau)'
  const code = e?.error || e?.message || 'inconnu'
  return `${MESSAGES[code] || 'Le paiement n\u2019a pas pu démarrer. Réessayez dans un instant.'} (${code})`
}

export function useAbonnement(userId) {
  const [etat, setEtat] = useState(null)            // réponse de GET /api/access
  const [chargement, setChargement] = useState(backendActif)
  const [erreur, setErreur] = useState('')
  const [paiementEnCours, setPaiementEnCours] = useState(false)
  const [verification, setVerification] = useState(false) // retour de FedaPay : confirmation en cours

  const rafraichir = useCallback(async () => {
    if (!backendActif) { setChargement(false); return null }
    setChargement(true)
    try {
      const e = await api.access()
      setEtat(e); setErreur('')
      return e
    } catch (err) {
      setEtat(null); setErreur(messageErreur(err))
      return null
    } finally { setChargement(false) }
  }, [])

  // Lecture de l'état à chaque changement d'utilisateur (le jeton de session accompagne l'appel).
  useEffect(() => { if (userId !== undefined) rafraichir() }, [userId, rafraichir])

  // Retour de FedaPay (?paiement=retour&id=…) : le serveur relit le statut chez FedaPay, puis on relit l'accès.
  useEffect(() => {
    if (!backendActif || !userId) return
    const q = new URLSearchParams(window.location.search)
    if (q.get('paiement') !== 'retour') return
    const id = q.get('id') || q.get('transaction_id') || undefined
    window.history.replaceState({}, '', window.location.pathname)
    setVerification(true)
    api.fedapayVerify(id).catch((e) => setErreur(messageErreur(e))).then(rafraichir).finally(() => setVerification(false))
  }, [userId, rafraichir])

  const payer = useCallback(async () => {
    setErreur(''); setPaiementEnCours(true)
    try {
      const r = await api.fedapayInit()
      if (!r?.url) throw new Error('fedapay_init')
      window.location.assign(r.url) // page de paiement FedaPay (Mobile Money / carte)
    } catch (e) {
      setErreur(messageErreur(e)); setPaiementEnCours(false)
    }
  }, [])

  // Sans backend (développement local) : pas de verrou. Sinon : l'API confirme Premium ou admin.
  const acces = !backendActif || !!etat?.abonne
  return { acces, etat, chargement, erreur, paiementEnCours, verification, payer, rafraichir }
}
