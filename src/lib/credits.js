// src/lib/credits.js
// État des crédits CST de l'utilisateur connecté : solde, forfaits, tarif, achat via FedaPay.
// Seule la LECTURE AUTOMATIQUE DES PLANS consomme des crédits ; tout le reste (projets, métré, prix, DQE, export PDF)
// est gratuit. Statuts : « standard » (compte connecté) · « admin » (jamais débité).
//
// Échoue « fermé » : si l'état ne peut pas être lu (réseau, serveur), la lecture reste verrouillée. Seule exception :
// aucun backend configuré (développement local) → pas de verrou.
import { useCallback, useEffect, useState } from 'react'
import { api, backendActif, EVT_CST } from './api.js'
import { peutLire } from './acces.js'
import { POLITIQUES_VERSION } from '../data/politiques.js'
import { APP_GRATUITE } from '../config/mode.js'

const MESSAGES = {
  auth_requise: 'Connectez-vous avec Google avant d\u2019acheter des crédits.',
  session_invalide: 'Votre session a expiré : reconnectez-vous.',
  fedapay_non_configure: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
  credits_non_configures: 'Le paiement n\u2019est pas encore disponible. Réessayez plus tard.',
  conditions_a_accepter: 'Acceptez les conditions d\u2019utilisation pour continuer.',
  forfait_invalide: 'Ce forfait n\u2019existe pas. Choisissez l\u2019un des forfaits proposés.',
  forfait_a_choisir: 'Choisissez un forfait pour continuer.',
}
// Message affiché + code technique entre parenthèses (utile pour le support) ; le détail complet va dans la console.
function messageErreur(e) {
  console.error('[credits]', e, e?.detail || '')
  if (e instanceof TypeError) return 'Serveur injoignable. Vérifiez votre connexion et réessayez. (réseau)'
  const code = e?.error || e?.message || 'inconnu'
  return `${MESSAGES[code] || 'Le paiement n\u2019a pas pu démarrer. Réessayez dans un instant.'} (${code})`
}

export function useCredits(userId) {
  const [etat, setEtat] = useState(null)            // réponse de GET /api/access
  const [chargement, setChargement] = useState(backendActif)
  const [erreur, setErreur] = useState('')
  const [paiementEnCours, setPaiementEnCours] = useState(false)
  const [verification, setVerification] = useState(false) // retour de FedaPay : confirmation en cours
  // Résultat du retour de FedaPay : { ok: true, credits, solde } (crédits ajoutés) ou { ok: false, statut } (non abouti).
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

  // Après chaque appel de lecture facturé, le serveur renvoie le nouveau solde : l'affichage le suit sans nouvel appel.
  useEffect(() => {
    const maj = (e) => { const s = e.detail?.solde; if (Number.isFinite(s)) setEtat((cur) => (cur ? { ...cur, solde: s } : cur)) }
    window.addEventListener(EVT_CST, maj)
    return () => window.removeEventListener(EVT_CST, maj)
  }, [])

  // Retour de FedaPay (?paiement=retour&id=…) : le serveur relit le statut chez FedaPay, puis on relit l'état.
  useEffect(() => {
    if (!backendActif || APP_GRATUITE || !userId) return
    const q = new URLSearchParams(window.location.search)
    if (q.get('paiement') !== 'retour') return
    const id = q.get('id') || q.get('transaction_id') || undefined
    window.history.replaceState({}, '', window.location.pathname)
    setVerification(true)
    ;(async () => {
      let r = null
      try { r = await api.fedapayVerify(id) } catch (e) { setErreur(messageErreur(e)) }
      const e = await rafraichir()
      if (r?.credite) setRetour({ ok: true, credits: r.credits ?? null, solde: r.solde ?? e?.solde ?? null })
      else if (r && r.statut !== 'aucune_transaction') setRetour({ ok: false, statut: r.statut })
      setVerification(false)
    })()
  }, [userId, rafraichir])

  // `forfait` : montant (FCFA) de l'un des forfaits proposés ; le serveur revalide et fixe le nombre de CST.
  const payer = useCallback(async (forfait, accepte) => {
    if (accepte !== true) { setErreur(messageErreur({ error: 'conditions_a_accepter' })); return }
    if (!forfait) { setErreur(messageErreur({ error: 'forfait_a_choisir' })); return }
    setErreur(''); setPaiementEnCours(true)
    try {
      const r = await api.fedapayInit({ acceptation: true, forfait, version: POLITIQUES_VERSION })
      if (!r?.url) throw new Error('fedapay_init')
      window.location.assign(r.url) // page de paiement FedaPay (Mobile Money / carte)
    } catch (e) {
      setErreur(messageErreur(e)); setPaiementEnCours(false)
    }
  }, [])

  // Statut affiché : standard (compte connecté) / admin (jamais débité, dans les deux modes) / gratuit (APP_GRATUITE : aucun crédit, aucun verrou).
  // Sans backend : « local », pas de verrou.
  // En version gratuite l'état est quand même lu, pour distinguer les administrateurs des autres comptes.
  const estAdminServeur = !!(etat?.admin || etat?.statut === 'admin')
  const statut = !backendActif ? (APP_GRATUITE ? 'gratuit' : 'local') : estAdminServeur ? 'admin' : APP_GRATUITE ? 'gratuit' : (etat?.statut || 'standard')
  const solde = Number(etat?.solde) || 0
  // La lecture de plans peut-elle démarrer ? (solde ≥ minimum, ou admin, ou pas de backend)
  const acces = APP_GRATUITE || peutLire(etat, backendActif)
  return { acces, statut, etat, solde, chargement, erreur, paiementEnCours, verification, retour, fermerRetour: () => setRetour(null), payer, rafraichir }
}
