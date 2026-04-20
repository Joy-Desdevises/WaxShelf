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

// ── Rating + Notes (propriétaire) ─────────────────────────────────────────────

export function useVinylMeta(vinylId) {
  const qc = useQueryClient()

  const saveMeta = useMutation({
    mutationFn: async ({ rating, notes }) => {
      const update = {}
      if (rating !== undefined) update.rating = rating
      if (notes !== undefined) update.notes = notes
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
