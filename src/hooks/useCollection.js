import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFullCollection, enrichCollectionMetadata } from '../lib/discogs'

// ── Lecture de la collection ─────────────────────────────────────────────────

export function useCollection(userId) {
  return useQuery({
    queryKey: ['collection', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('vinyl_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// ── Lecture par username (vue publique) ──────────────────────────────────────

export function useCollectionByUsername(username) {
  return useQuery({
    queryKey: ['collection', 'public', username],
    queryFn: async () => {
      // 1. Récupérer l'id du profil via le username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_public')
        .eq('username', username)
        .single()
      if (profileError) throw profileError
      if (!profile.is_public) return []

      // 2. Récupérer la collection
      const { data, error } = await supabase
        .from('vinyl_records')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!username,
  })
}

// ── Sync Discogs ──────────────────────────────────────────────────────────────

export function useSyncDiscogs() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, discogsToken, discogsUsername, onEnrichProgress }) => {
      // 1. Récupérer la collection depuis Discogs
      const releases = await fetchFullCollection(discogsToken, discogsUsername)

      // 2. Upsert par lots de 100 (évite les timeouts sur les grandes collections)
      const records = releases.map((r) => ({ ...r, user_id: userId }))
      const BATCH = 100
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH)
        const { error } = await supabase
          .from('vinyl_records')
          .upsert(batch, {
            onConflict: 'user_id,discogs_id',
            ignoreDuplicates: false,
          })
        if (error) throw error
      }

      // 3. Compléter/rafraîchir le pays, l'année, la valeur marché, le
      // master_id et l'année originale de l'album pour tous les vinyles :
      // l'endpoint collection ne fournit rien de tout ça, seul le détail
      // /releases/{id} (+ son master) les a. On revérifie systématiquement
      // tout le monde à chaque sync (pas seulement les champs manquants),
      // pour qu'un seul bouton suffise à garder pays/années/valeurs à jour —
      // la valeur en particulier évolue dans le temps, donc même un disque
      // déjà complet mérite d'être revérifié.
      const { data: toEnrich, error: selectError } = await supabase
        .from('vinyl_records')
        .select('id, discogs_id, year, value_manual')
        .eq('user_id', userId)
        .not('discogs_id', 'is', null)
      if (selectError) throw selectError

      if (toEnrich?.length) {
        // Une valeur saisie à la main (value_manual) ne doit jamais être
        // écrasée par le prix automatique, même si le disque est retraité
        // pour une autre donnée manquante (année, master_id...).
        const manualById = new Map(toEnrich.map((r) => [r.id, r.value_manual]))
        const enriched = await enrichCollectionMetadata(discogsToken, toEnrich, onEnrichProgress)
        const EBATCH = 50
        for (let i = 0; i < enriched.length; i += EBATCH) {
          const chunk = enriched.slice(i, i + EBATCH)
          const results = await Promise.all(
            chunk.map(({ id, country, year, average_value, average_value_currency, master_id, original_year }) => {
              const update = { country, year, master_id, original_year }
              if (!manualById.get(id)) {
                update.average_value = average_value
                update.average_value_currency = average_value_currency
              }
              return supabase.from('vinyl_records').update(update).eq('id', id)
            })
          )
          const failed = results.find((r) => r.error)
          if (failed) throw failed.error
        }
      }

      return releases.length
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['collection', userId] })
    },
  })
}

// ── Ajout manuel ──────────────────────────────────────────────────────────────

export function useAddVinyl() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, vinyl }) => {
      const { data, error } = await supabase
        .from('vinyl_records')
        .insert({ ...vinyl, user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['collection', userId] })
    },
  })
}

// ── Suppression ───────────────────────────────────────────────────────────────

export function useDeleteVinyl() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, vinylId }) => {
      const { error } = await supabase
        .from('vinyl_records')
        .delete()
        .eq('id', vinylId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['collection', userId] })
    },
  })
}
