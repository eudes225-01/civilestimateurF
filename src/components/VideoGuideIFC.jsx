// src/components/VideoGuideIFC.jsx
// Vidéo tutoriel « comment créer un fichier IFC », annoncée avant les dépôts de plans.
//  • format paysage 16:9 ;
//  • démarre automatiquement (muette, comme l'imposent les navigateurs) la PREMIÈRE fois que
//    l'utilisateur arrive sur les dépôts ; ensuite elle reste repliée, à ouvrir à la demande ;
//  • facultative : un bouton la masque à tout moment, et elle s'arrête alors ;
//  • le lien se règle dans src/config/video.js (ou VITE_VIDEO_IFC_URL) ; sans lien, rien n'est affiché.
import React, { useEffect, useState } from 'react'
import { PlayCircle, X, Volume2 } from 'lucide-react'
import { Button } from './ui/index.jsx'
import { useAuth } from '../lib/auth.jsx'
import { VIDEO_IFC_URL, VIDEO_IFC_TITRE } from '../config/video.js'
import { analyserLienVideo, srcLecture, dejaVue, marquerVue } from '../lib/video.js'

export const EVT_OUVRIR_VIDEO_IFC = 'ouvrir-video-ifc'

export default function VideoGuideIFC({ url = VIDEO_IFC_URL, titre = VIDEO_IFC_TITRE }) {
  const { session } = useAuth()
  const userId = session?.user?.id || null
  const video = analyserLienVideo(url)
  const [ouverte, setOuverte] = useState(false)
  const [auto, setAuto] = useState(false)

  // Première connexion : ouverture + lecture automatiques, une seule fois par utilisateur et par vidéo.
  useEffect(() => {
    if (!video) return
    let vue = false
    try { vue = dejaVue(window.localStorage, userId, url) } catch { vue = false }
    if (!vue) {
      setOuverte(true); setAuto(true)
      try { marquerVue(window.localStorage, userId, url) } catch { /* ignoré */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, url])

  // Bouton « Comment créer un IFC ? » de la zone de dépôt IFC.
  useEffect(() => {
    const ouvrir = () => { setOuverte(true); setAuto(true) }
    window.addEventListener(EVT_OUVRIR_VIDEO_IFC, ouvrir)
    return () => window.removeEventListener(EVT_OUVRIR_VIDEO_IFC, ouvrir)
  }, [])

  if (!video) return null

  return (
    <section aria-label={titre} className="mb-4 rounded-xl2 border border-lagune/30 bg-lagune-soft/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-[14px] inline-flex items-center gap-2"><PlayCircle size={17} className="text-lagune-deep" /> Tutoriel vidéo : {titre.toLowerCase()}</h3>
          <p className="text-[12px] text-muted mt-0.5">Facultatif — utile si vous ne savez pas exporter votre plan au format IFC. Un IFC rend la lecture des murs, dalles et poteaux plus rapide et plus précise.</p>
        </div>
        {ouverte
          ? <Button size="sm" variant="ghost" onClick={() => { setOuverte(false); setAuto(false) }}><X size={14} /> Masquer la vidéo</Button>
          : <Button size="sm" variant="outline" onClick={() => { setOuverte(true); setAuto(true) }}><PlayCircle size={14} /> Regarder la vidéo</Button>}
      </div>

      {ouverte && (
        <div className="mt-3">
          {/* Paysage 16:9, centrée, jamais plus haute que large */}
          <div className="mx-auto w-full max-w-[880px] aspect-video rounded-xl overflow-hidden bg-black shadow-soft" style={{ aspectRatio: '16 / 9' }}>
            {video.kind === 'fichier' ? (
              <video className="w-full h-full" src={video.src} controls playsInline autoPlay={auto} muted={auto} preload="metadata" />
            ) : (
              <iframe className="w-full h-full" src={srcLecture(video, auto)} title={titre} loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            )}
          </div>
          {auto && <p className="mt-2 text-center text-[11.5px] text-muted inline-flex items-center justify-center gap-1.5 w-full"><Volume2 size={12} /> La vidéo démarre sans le son : activez-le avec les commandes du lecteur.</p>}
        </div>
      )}
    </section>
  )
}
