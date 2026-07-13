import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchWantlist } from '../lib/discogs'

export function useWantlistItems(username) {
  const { data: profileData } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single()
      return data
    },
    enabled: !!username,
  })

  return useQuery({
    queryKey: ['wantlist', username],
    queryFn: async () => {
      if (!profileData?.id) return []
      const { data, error } = await supabase
        .from('wantlist_items')
        .select('*')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!profileData?.id,
  })
}

export function useSyncWantlist() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, discogsToken, discogsUsername }) => {
      const wants = await fetchWantlist(discogsToken, discogsUsername)

      const records = wants.map((w) => ({ ...w, user_id: userId }))
      const BATCH = 100
      for (let i = 0; i < records.length; i += BATCH) {
        const { error } = await supabase
          .from('wantlist_items')
          .upsert(records.slice(i, i + BATCH), {
            onConflict: 'user_id,discogs_id',
            ignoreDuplicates: false,
          })
        if (error) throw error
      }

      // Supprime les envies qui ne sont plus dans la wantlist Discogs
      // (l'upsert seul ne fait qu'ajouter/mettre à jour, jamais nettoyer).
      const currentIds = wants.map((w) => w.discogs_id)
      let deleteQuery = supabase.from('wantlist_items').delete().eq('user_id', userId)
      deleteQuery = currentIds.length > 0
        ? deleteQuery.not('discogs_id', 'in', `(${currentIds.join(',')})`)
        : deleteQuery
      const { error: deleteError } = await deleteQuery
      if (deleteError) throw deleteError

      return wants.length
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wantlist'] })
    },
  })
}
