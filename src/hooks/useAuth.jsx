import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Contexte plutôt qu'un simple hook : plusieurs endroits de l'app (header,
// accueil, wantlist, collection...) lisent et mettent à jour le même profil
// (ex: last_collection_sync_at après une sync). Avec un hook local, chaque
// composant aurait son propre état isolé et ne verrait pas les mises à jour
// faites ailleurs sans recharger la page.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Écoute les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const [{ data }, { data: secret }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('profile_secrets').select('discogs_token').eq('user_id', userId).maybeSingle(),
    ])
    setProfile(data ? { ...data, discogs_token: secret?.discogs_token ?? null } : null)
    setLoading(false)
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, username) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
  }

  async function updatePassword(password) {
    const result = await supabase.auth.updateUser({ password })
    if (!result.error) setPasswordRecovery(false)
    return result
  }

  async function updateProfile(updates) {
    if (!user) return
    // discogs_token vit dans profile_secrets (RLS propriétaire uniquement),
    // pas dans profiles (lisible publiquement si is_public = true) — voir
    // migration 20260716150000_profile_secrets.
    const hasToken = 'discogs_token' in updates
    const { discogs_token, ...profileUpdates } = updates

    let secretError = null
    if (hasToken) {
      const { error } = await supabase
        .from('profile_secrets')
        .upsert({ user_id: user.id, discogs_token })
      secretError = error
    }

    if (Object.keys(profileUpdates).length === 0) {
      if (!secretError) setProfile((p) => (p ? { ...p, discogs_token } : p))
      return { data: profile, error: secretError }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile({ ...data, discogs_token: hasToken ? discogs_token : profile?.discogs_token ?? null })
    return { data, error: error || secretError }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, passwordRecovery, signIn, signUp, signOut, updateProfile, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
