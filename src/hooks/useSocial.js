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

// Compteur léger pour l'affichage type "Stat & Social" — la liste complète
// n'est chargée que si l'utilisateur ouvre la modale. Passe par une fonction
// security definer plutôt qu'une requête directe : cette activité DONNÉE
// (peu importe le disque concerné) doit rester cachée si l'auteur (userId)
// est privé, même quand le disque liké appartient à quelqu'un de public —
// voir migration 20260906160000_private_given_activity.
export function useMyLikesCount(userId) {
  return useQuery({
    queryKey: ['my-likes-count', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_likes_count', { target_user_id: userId })
      if (error) throw error
      return data || 0
    },
    enabled: !!userId,
  })
}

// Vinyles likés par userId, avec les infos nécessaires pour les afficher et
// retrouver le profil propriétaire. Reshape côté client vers la forme
// attendue par LikesModal (vinyl_records.profiles imbriqués), pour ne rien
// changer côté composants malgré le passage par la RPC ci-dessus.
export function useMyLikes(userId, enabled = true) {
  return useQuery({
    queryKey: ['my-likes', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_likes', { target_user_id: userId })
      if (error) throw error
      return data.map((r) => ({
        id: r.like_id,
        vinyl_records: {
          id: r.vinyl_id,
          title: r.title,
          artist: r.artist,
          thumb_image: r.thumb_image,
          cover_image: r.cover_image,
          profiles: { username: r.owner_username, display_name: r.owner_display_name },
        },
      }))
    },
    enabled: enabled && !!userId,
  })
}

// Compteur léger des likes reçus sur les vinyles de userId, peu importe qui
// les a likés — jointure sur vinyl_records pour filtrer par propriétaire.
export function useReceivedLikesCount(userId) {
  return useQuery({
    queryKey: ['received-likes-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('vinyl_likes')
        .select('id, vinyl_records!inner(user_id)', { count: 'exact', head: true })
        .eq('vinyl_records.user_id', userId)
      return count || 0
    },
    enabled: !!userId,
  })
}

// Likes reçus sur les vinyles de userId, avec l'utilisateur qui a liké et
// le vinyle concerné.
export function useReceivedLikes(userId) {
  return useQuery({
    queryKey: ['received-likes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinyl_likes')
        .select('id, created_at, profiles(username, avatar_url, display_name), vinyl_records!inner(id, title, artist, thumb_image, cover_image, user_id)')
        .eq('vinyl_records.user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
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

// Compteur léger des commentaires laissés par userId, sur n'importe quel
// vinyle — même principe que useMyLikesCount (RPC gatée sur la
// confidentialité de l'auteur, pas celle du disque commenté).
export function useMyCommentsCount(userId) {
  return useQuery({
    queryKey: ['my-comments-count', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_comments_count', { target_user_id: userId })
      if (error) throw error
      return data || 0
    },
    enabled: !!userId,
  })
}

// Compteur léger des commentaires reçus sur les vinyles de userId, peu
// importe qui les a laissés — jointure sur vinyl_records pour filtrer par
// propriétaire du disque commenté.
export function useReceivedCommentsCount(userId) {
  return useQuery({
    queryKey: ['received-comments-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('vinyl_comments')
        .select('id, vinyl_records!inner(user_id)', { count: 'exact', head: true })
        .eq('vinyl_records.user_id', userId)
      return count || 0
    },
    enabled: !!userId,
  })
}

// Commentaires laissés par userId, avec le vinyle concerné et son
// propriétaire (peut différer de userId si commenté chez quelqu'un d'autre)
// pour pouvoir naviguer vers la bonne collection. Reshape côté client vers
// la forme attendue par CommentsModal, même principe que useMyLikes.
export function useMyComments(userId) {
  return useQuery({
    queryKey: ['my-comments', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_comments', { target_user_id: userId })
      if (error) throw error
      return data.map((r) => ({
        id: r.comment_id,
        content: r.content,
        created_at: r.created_at,
        vinyl_records: {
          id: r.vinyl_id,
          title: r.title,
          artist: r.artist,
          thumb_image: r.thumb_image,
          cover_image: r.cover_image,
          profiles: { username: r.owner_username, display_name: r.owner_display_name },
        },
      }))
    },
    enabled: !!userId,
  })
}

// Commentaires reçus sur les vinyles de userId, avec l'auteur du commentaire
// et le vinyle concerné.
export function useReceivedComments(userId) {
  return useQuery({
    queryKey: ['received-comments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinyl_comments')
        .select('id, content, created_at, profiles(username, avatar_url, display_name), vinyl_records!inner(id, title, artist, thumb_image, cover_image, user_id)')
        .eq('vinyl_records.user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
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
