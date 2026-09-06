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

// Recherche de profils par pseudo, pour la barre de recherche du header.
// Le profil est désormais lisible par tous quel que soit is_public (voir
// migration 20260906140000_open_profile_visibility) — un compte privé
// apparaît donc ici comme sur Instagram, seul son contenu reste caché.
export function useSearchProfiles(query) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['search-profiles', trimmed],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${trimmed}%`)
        .limit(8)
      if (error) throw error
      return data
    },
    enabled: trimmed.length >= 2,
  })
}
