import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchFullCollection } from '../lib/discogs'

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
    mutationFn: async ({ userId, discogsToken, discogsUsername }) => {
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
