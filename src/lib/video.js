// src/lib/video.js — module pur (testable sous Node) : analyse d'un lien vidéo et mémoire « déjà vue ».

/** @returns {{kind: 'youtube'|'vimeo'|'fichier', src: string} | null} */
export function analyserLienVideo(url) {
  const u = String(url || '').trim()
  if (!u) return null
  let m = u.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i)
    || u.match(/^https?:\/\/youtu\.be\/([\w-]{6,})/i)
    || u.match(/^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts)\/([\w-]{6,})/i)
  if (m) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${m[1]}` }
  m = u.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i) || u.match(/^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i)
  if (m) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}` }
  if (/^https?:\/\/.+\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u)) return { kind: 'fichier', src: u }
  return null
}

/** Adresse du lecteur avec démarrage automatique (muet : les navigateurs interdisent l'autoplay avec le son). */
export function srcLecture(video, auto) {
  if (!video) return ''
  const sep = video.src.includes('?') ? '&' : '?'
  if (video.kind === 'youtube') return `${video.src}${sep}rel=0&modestbranding=1${auto ? '&autoplay=1&mute=1' : ''}`
  if (video.kind === 'vimeo') return `${video.src}${sep}title=0&byline=0${auto ? '&autoplay=1&muted=1' : ''}`
  return video.src
}

/** Clé de mémoire « vidéo déjà présentée » : une par utilisateur (et par lien, pour ré-annoncer une nouvelle vidéo). */
export const cleVideoVue = (userId, url) => `civilestimateur:video-ifc:${userId || 'anonyme'}:${String(url || '').slice(-60)}`

export function dejaVue(stockage, userId, url) {
  try { return stockage.getItem(cleVideoVue(userId, url)) === '1' } catch { return false }
}
export function marquerVue(stockage, userId, url) {
  try { stockage.setItem(cleVideoVue(userId, url), '1') } catch { /* navigation privée : tant pis, elle sera re-proposée */ }
}
