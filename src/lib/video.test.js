import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserLienVideo, srcLecture, dejaVue, marquerVue } from './video.js'

test('liens YouTube, Vimeo et fichier reconnus ; le reste refusé', () => {
  assert.equal(analyserLienVideo('https://www.youtube.com/watch?v=abc123XYZ_-&t=3').src, 'https://www.youtube-nocookie.com/embed/abc123XYZ_-')
  assert.equal(analyserLienVideo('https://youtu.be/abc123XYZ_-').kind, 'youtube')
  assert.equal(analyserLienVideo('https://vimeo.com/123456789').src, 'https://player.vimeo.com/video/123456789')
  assert.equal(analyserLienVideo('https://cdn.exemple.com/tuto.mp4?x=1').kind, 'fichier')
  assert.equal(analyserLienVideo(''), null)
  assert.equal(analyserLienVideo('javascript:alert(1)'), null)
  assert.equal(analyserLienVideo('https://exemple.com/page.html'), null)
})

test('démarrage automatique : muet, uniquement si demandé', () => {
  const yt = analyserLienVideo('https://youtu.be/abc123XYZ_-')
  assert.match(srcLecture(yt, true), /autoplay=1&mute=1/)
  assert.doesNotMatch(srcLecture(yt, false), /autoplay/)
  assert.match(srcLecture(analyserLienVideo('https://vimeo.com/12345'), true), /autoplay=1&muted=1/)
})

test('première connexion : vue une seule fois par utilisateur et par vidéo', () => {
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
  assert.equal(dejaVue(st, 'u1', 'https://youtu.be/aaaaaaaa'), false)
  marquerVue(st, 'u1', 'https://youtu.be/aaaaaaaa')
  assert.equal(dejaVue(st, 'u1', 'https://youtu.be/aaaaaaaa'), true)
  assert.equal(dejaVue(st, 'u2', 'https://youtu.be/aaaaaaaa'), false)      // autre utilisateur
  assert.equal(dejaVue(st, 'u1', 'https://youtu.be/bbbbbbbb'), false)      // nouvelle vidéo : ré-annoncée
  assert.equal(dejaVue({ getItem() { throw new Error('bloqué') } }, 'u1', 'x'), false)
})
