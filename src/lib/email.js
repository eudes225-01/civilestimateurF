// src/lib/email.js
// EmailJS — notifications admin uniquement (nouvel utilisateur).
// Configurez les clés dans .env (VITE_EMAILJS_*).
import emailjs from '@emailjs/browser'

const PUBLIC_KEY    = import.meta.env.VITE_EMAILJS_PUBLIC_KEY    || ''
const SERVICE_ID    = import.meta.env.VITE_EMAILJS_SERVICE_ID    || 'service_ljozok4'
const ADMIN         = import.meta.env.VITE_EMAILJS_ADMIN         || 'archinova87@gmail.com'
const TPL_ADMIN_NEW = import.meta.env.VITE_EMAILJS_TPL_ADMIN_NEW || ''

let inited = false
function ensureInit() {
  if (!inited && PUBLIC_KEY) { emailjs.init({ publicKey: PUBLIC_KEY }); inited = true }
  return inited
}

export const emailReady = () => Boolean(PUBLIC_KEY)

async function send(template, params) {
  if (!ensureInit() || !template) return null
  return emailjs.send(SERVICE_ID, template, { admin_email: ADMIN, ...params })
}

/** Notifie l'admin qu'un visiteur a démarré une session (profil choisi). */
export async function notifySession({ profile = '' }) {
  const profilLabel = profile === 'pro' ? 'Professionnel du génie civil' : 'Particulier'
  return send(TPL_ADMIN_NEW, {
    to_email: ADMIN,
    user_name: '(visiteur anonyme)',
    user_email: '—',
    profile: profilLabel,
    date: new Date().toLocaleString('fr-FR'),
  })
}
