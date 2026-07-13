import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useFollowCounts(userId) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      return { followers: followers || 0, following: following || 0 }
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
export function useFollowList(userId, direction, enabled = true) {
  const filterColumn = direction === 'followers' ? 'following_id' : 'follower_id'
  const targetColumn = direction === 'followers' ? 'follower_id' : 'following_id'

  return useQuery({
    queryKey: ['follow-list', userId, direction],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('follows')
        .select(targetColumn)
        .eq(filterColumn, userId)
      if (error) throw error

      const ids = rows.map((r) => r[targetColumn])
      if (ids.length === 0) return []

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids)
      if (profError) throw profError
      return profiles
    },
    enabled: enabled && !!userId,
  })
}
