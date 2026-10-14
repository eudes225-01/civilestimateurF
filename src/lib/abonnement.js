// src/lib/abonnement.js
// État d'abonnement de l'utilisateur connecté. Seuls deux éléments sont Premium :
//   • les DÉPÔTS de plans (lecture automatique des plans),
//   • l'EXPORT PDF.
// Tout le reste (Projet, Niveaux & métré, Prix, DQE, enregistrement des projets) est gratuit.
//
// Statuts : « standard » (compte gratuit) · « premium » (abonnement FedaPay actif) · « admin »
// (accès complet, sans paiement). Le serveur reste l'autorité (il refuse l'analyse de plan et le PDF
// sans abonnement) ; ce hook ne sert qu'à afficher les verrous, le statut et le paiement.
//
// Échoue « fermé » : si l'état ne peut pas être lu (réseau, serveur), les fonctions Premium restent
// verrouillées. Seule exception : aucun backend configuré (développement local) → pas de verrou.
import { useCallback, useEffect, useState } from 'react'
import { api, backendActif } from './api.js'
import { POLITIQUES_VERSION } from '../data/politiques.js'

const MESSAGES = {
  auth_requise: 'Connectez-vous avec Google avant de vous abonner.',
  session_invalide: 'Votre session a expiré : reconnectez-vous.',
  fedapay_non_configure: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
  abonnements_non_configures: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
  conditions_a_accepter: 'Acceptez les conditions d\u2019utilisation pour continuer.',
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
  // Résultat du retour de FedaPay : { ok: true, fin } (paiement confirmé) ou { ok: false, statut } (non abouti).
  const [retour, setRetour] = useState(null)

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
    ;(async () => {
      let r = null
      try { r = await api.fedapayVerify(id) } catch (e) { setErreur(messageErreur(e)) }
      const e = await rafraichir()
      if (r?.actif) setRetour({ ok: true, fin: r.fin || e?.finAbonnement || null })
      else if (r && r.statut !== 'aucune_transaction') setRetour({ ok: false, statut: r.statut })
      setVerification(false)
    })()
  }, [userId, rafraichir])

  const payer = useCallback(async (accepte) => {
    if (accepte !== true) { setErreur(messageErreur({ error: 'conditions_a_accepter' })); return }
    setErreur(''); setPaiementEnCours(true)
    try {
      const r = await api.fedapayInit({ acceptation: true, version: POLITIQUES_VERSION })
      if (!r?.url) throw new Error('fedapay_init')
      window.location.assign(r.url) // page de paiement FedaPay (Mobile Money / carte)
    } catch (e) {
      setErreur(messageErreur(e)); setPaiementEnCours(false)
    }
  }, [])

  // Statut affiché : standard (gratuit) / premium (abonnement actif) / admin (tout, sans payer).
  const statut = !backendActif ? 'local' : (etat?.statut || (etat?.abonne ? 'premium' : 'standard'))
  // Sans backend (développement local) : pas de verrou. Sinon : Premium ou admin exigé pour les fonctions payantes.
  const acces = !backendActif || !!etat?.abonne
  return { acces, statut, etat, chargement, erreur, paiementEnCours, verification, retour, fermerRetour: () => setRetour(null), payer, rafraichir }
}
