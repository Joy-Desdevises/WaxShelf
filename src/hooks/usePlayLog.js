import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Nombre de fois qu'un vinyle a été joué (par l'user connecté)
export function usePlayCount(vinylId) {
  const { data } = useQuery({
    queryKey: ['playCount', vinylId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('play_logs')
        .select('id', { count: 'exact', head: true })
        .eq('vinyl_id', vinylId)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!vinylId,
  })
  return data ?? 0
}

// Logger une écoute
export function useLogPlay(vinylId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase
        .from('play_logs')
        .insert({ user_id: userId, vinyl_id: vinylId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playCount', vinylId] })
      qc.invalidateQueries({ queryKey: ['journal'] })
      qc.invalidateQueries({ queryKey: ['activityFeed'] })
    },
  })
}

// Journal complet d'un user (toutes ses écoutes avec infos vinyle)
export function useJournal(userId) {
  return useQuery({
    queryKey: ['journal', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('play_logs')
        .select(`
          id,
          played_at,
          vinyl_records (
            id, title, artist, year, cover_image, thumb_image, genres, styles
          )
        `)
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Stats du journal d'un user
export function useJournalStats(userId) {
  return useQuery({
    queryKey: ['journalStats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('play_logs')
        .select('played_at, vinyl_id, vinyl_records(title, artist, cover_image, thumb_image)')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
      if (error) throw error

      const total = data.length

      // Vinyle le plus écouté
      const counts = {}
      data.forEach(({ vinyl_id, vinyl_records: v }) => {
        if (!counts[vinyl_id]) counts[vinyl_id] = { vinyl: v, count: 0 }
        counts[vinyl_id].count++
      })
      const mostPlayed = Object.values(counts).sort((a, b) => b.count - a.count)[0] ?? null

      // Écoutes cette semaine
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thisWeek = data.filter((p) => new Date(p.played_at) >= weekAgo).length

      return { total, mostPlayed, thisWeek }
    },
    enabled: !!userId,
  })
}
