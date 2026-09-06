import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Compteurs toujours publics (juste des nombres) même sur un profil
// privé — passe par une fonction security definer car la lecture
// directe de `follows` est désormais restreinte à ses deux parties
// (voir migration 20260906140000_open_profile_visibility).
export function useFollowCounts(userId) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_follow_counts', { target_user_id: userId }).single()
      if (error) throw error
      return { followers: data.followers || 0, following: data.following || 0 }
    },
    enabled: !!userId,
  })
}

export function useIsFollowing(followerId, followingId) {
  return useQuery({
    queryKey: ['is-following', followerId, followingId],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle()
      return !!data
    },
    enabled: !!followerId && !!followingId && followerId !== followingId,
  })
}

export function useToggleFollow() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ followerId, followingId, isFollowing }) => {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: followerId, following_id: followingId })
        if (error) throw error
      }
    },
    onSuccess: (_, { followerId, followingId }) => {
      qc.invalidateQueries({ queryKey: ['is-following', followerId, followingId] })
      qc.invalidateQueries({ queryKey: ['follow-counts', followerId] })
      qc.invalidateQueries({ queryKey: ['follow-counts', followingId] })
    },
  })
}

// direction: 'followers' (qui suit userId) ou 'following' (qui userId suit)
// Liste détaillée réservée au propriétaire quand son profil est privé
// (comme Instagram) — la fonction get_follow_list applique cette règle
// côté serveur ; voir migration 20260906140000_open_profile_visibility.
export function useFollowList(userId, direction, enabled = true) {
  return useQuery({
    queryKey: ['follow-list', userId, direction],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_follow_list', {
        target_user_id: userId,
        direction,
      })
      if (error) throw error
      return data
    },
    enabled: enabled && !!userId,
  })
}
