import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Résout un pseudo en id de profil — utilisé partout où une page a un
// :username dans l'URL mais a besoin de l'id réel (follows, wantlist...).
export function useProfileByUsername(username) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_public')
        .eq('username', username)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!username,
  })
}
