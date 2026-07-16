import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ── Likes ─────────────────────────────────────────────────────────────────────

export function useLikes(vinylId) {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['likes', vinylId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinyl_likes')
        .select('id, user_id')
        .eq('vinyl_id', vinylId)
      if (error) throw error
      return data
    },
    enabled: !!vinylId,
  })

  const likes = data || []

  const toggleLike = useMutation({
    mutationFn: async ({ userId, hasLiked }) => {
      if (hasLiked) {
        const { error } = await supabase
          .from('vinyl_likes')
          .delete()
          .eq('vinyl_id', vinylId)
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vinyl_likes')
          .insert({ vinyl_id: vinylId, user_id: userId })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['likes', vinylId] }),
  })

  return { likes, toggleLike }
}

// Compteur léger (HEAD request) pour l'affichage type "Stat & Social" — la
// liste complète n'est chargée que si l'utilisateur ouvre la modale.
export function useMyLikesCount(userId) {
  return useQuery({
    queryKey: ['my-likes-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('vinyl_likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return count || 0
    },
    enabled: !!userId,
  })
}

// Vinyles likés par userId, avec les infos nécessaires pour les afficher et
// retrouver le profil propriétaire. Si le propriétaire est repassé en privé
// entre-temps, la ligne vinyl_records devient invisible via RLS — on la
// filtre plutôt que d'afficher un like sur un disque fantôme.
export function useMyLikes(userId, enabled = true) {
  return useQuery({
    queryKey: ['my-likes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinyl_likes')
        .select('id, vinyl_records(id, title, artist, thumb_image, cover_image, profiles(username, display_name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.filter((l) => l.vinyl_records)
    },
    enabled: enabled && !!userId,
  })
}

// ── Commentaires ──────────────────────────────────────────────────────────────

export function useComments(vinylId) {
  const qc = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', vinylId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinyl_comments')
        .select('id, content, created_at, user_id, profiles(username, avatar_url, display_name)')
        .eq('vinyl_id', vinylId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!vinylId,
  })

  const addComment = useMutation({
    mutationFn: async ({ userId, content }) => {
      const { error } = await supabase
        .from('vinyl_comments')
        .insert({ vinyl_id: vinylId, user_id: userId, content })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', vinylId] }),
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId) => {
      const { error } = await supabase
        .from('vinyl_comments')
        .delete()
        .eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', vinylId] }),
  })

  return { comments, isLoading, addComment, deleteComment }
}

// ── Rating + Notes + Valeur (propriétaire) ────────────────────────────────────

export function useVinylMeta(vinylId) {
  const qc = useQueryClient()

  const saveMeta = useMutation({
    mutationFn: async ({ rating, notes, average_value, average_value_currency, value_manual }) => {
      const update = {}
      if (rating !== undefined) update.rating = rating
      if (notes !== undefined) update.notes = notes
      if (average_value !== undefined) update.average_value = average_value
      if (average_value_currency !== undefined) update.average_value_currency = average_value_currency
      if (value_manual !== undefined) update.value_manual = value_manual
      const { error } = await supabase
        .from('vinyl_records')
        .update(update)
        .eq('id', vinylId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })

  return { saveMeta }
}
