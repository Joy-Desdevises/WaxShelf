import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Pas de table dédiée : le nombre de notifications non vues est calculé à
// la volée (likes + commentaires reçus + nouveaux abonnés créés après
// last_notifications_seen_at). Voir migration 20260906150000_notifications_seen_at.
export function useUnreadNotificationsCount(userId, since) {
  return useQuery({
    queryKey: ['unread-notifications', userId, since],
    queryFn: async () => {
      const sinceDate = since || '1970-01-01T00:00:00Z'

      const [likes, comments, followers] = await Promise.all([
        supabase
          .from('vinyl_likes')
          .select('id, vinyl_records!inner(user_id)', { count: 'exact', head: true })
          .eq('vinyl_records.user_id', userId)
          .neq('user_id', userId)
          .gt('created_at', sinceDate),
        supabase
          .from('vinyl_comments')
          .select('id, vinyl_records!inner(user_id)', { count: 'exact', head: true })
          .eq('vinyl_records.user_id', userId)
          .neq('user_id', userId)
          .gt('created_at', sinceDate),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId)
          .gt('created_at', sinceDate),
      ])

      return (likes.count || 0) + (comments.count || 0) + (followers.count || 0)
    },
    enabled: !!userId,
  })
}

// Abonnés récents avec leur profil, pour le flux affiché sur Stat & Social.
// Lecture directe sur `follows` (pas besoin de la RPC get_follow_list ici) :
// l'appelant consulte forcément ses propres relations, déjà autorisées par
// la policy RLS "follows: lecture propriétaire de la relation".
export function useRecentFollowers(userId, limit = 20) {
  return useQuery({
    queryKey: ['recent-followers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('created_at, profiles!follower_id(id, username, display_name, avatar_url)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}
