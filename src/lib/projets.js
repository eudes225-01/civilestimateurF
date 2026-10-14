// src/lib/projets.js
// Projets enregistrés en base (table `projets`, protégée par Row Level Security :
// chaque utilisateur ne voit que les siens). Les fichiers de plans ne sont pas
// stockés — seuls leurs noms le sont, dans `data.plans`.
import { supabase } from './supabase.js'

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data }

export const listerProjets = async () =>
  ok(await supabase.from('projets').select('id, titre, modifie_le').order('modifie_le', { ascending: false }).limit(100))

export const chargerProjet = async (id) =>
  ok(await supabase.from('projets').select('id, titre, data').eq('id', id).single())

/** Crée (sans id) ou met à jour (avec id). Renvoie { id, modifie_le }. */
export async function sauverProjet({ id, titre, data }) {
  const ligne = { titre: (titre || '').trim() || 'Projet sans titre', data }
  if (id) return ok(await supabase.from('projets').update(ligne).eq('id', id).select('id, modifie_le').single())
  return ok(await supabase.from('projets').insert(ligne).select('id, modifie_le').single())
}

export const supprimerProjet = async (id) => { ok(await supabase.from('projets').delete().eq('id', id)) }

/** Instantané sérialisable de l'état de l'application. */
export function instantane({ proj, params, levels, prix, depots, conserves }) {
  const prixModifies = {}
  prix.forEach((p) => { if (p.pu !== (p.sac ?? p.bi)) prixModifies[p.code] = p.pu })
  const plans = { ...(conserves || {}) }
  Object.entries(depots || {}).forEach(([k, l]) => { if (l?.length) plans[k] = l.map((f) => f.name) })
  return { v: 1, proj, params, levels, prixModifies, plans }
}
