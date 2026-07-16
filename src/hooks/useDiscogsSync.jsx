import { createContext, useContext, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useSyncDiscogs } from './useCollection'
import { useSyncWantlist } from './useWantlist'
import { supabase } from '../lib/supabase'
import DiscogsTokenModal from '../components/modals/DiscogsTokenModal'

// Contexte plutôt qu'un hook local : la sync peut prendre plusieurs minutes
// sur une grosse collection, et le bouton qui la déclenche (header ou
// accueil) vit dans un composant de page qui se démonte à chaque changement
// de route. Avec un hook local, naviguer pendant la sync démontait son état
// (progression, toast) en cours de route — d'où l'impression qu'elle
// s'arrêtait. Un seul état partagé, posé au-dessus du routeur, survit à la
// navigation.
const DiscogsSyncContext = createContext(null)

export function DiscogsSyncProvider({ children }) {
  const { user, profile, updateProfile } = useAuth()
  const syncMutation = useSyncDiscogs()
  const wantlistSyncMutation = useSyncWantlist()
  const qc = useQueryClient()

  const [showDiscogsModal, setShowDiscogsModal] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState(null) // { done, total }
  const [syncStep, setSyncStep] = useState(null) // 'collection' | 'wantlist'
  const [toast, setToast] = useState(null)

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleSync(freshValues = null) {
    let discogsToken = freshValues?.token || profile?.discogs_token
    let discogsUsername = freshValues?.discogsUsername || profile?.discogs_username

    if (!discogsToken && user?.id) {
      const { data } = await supabase
        .from('profile_secrets')
        .select('discogs_token')
        .eq('user_id', user.id)
        .maybeSingle()
      discogsToken = data?.discogs_token
    }

    if (!discogsToken) {
      setShowDiscogsModal(true)
      return
    }

    setEnrichProgress(null)
    setSyncStep('collection')
    try {
      const count = await syncMutation.mutateAsync({
        userId: user.id,
        discogsToken,
        discogsUsername,
        onEnrichProgress: (done, total) => setEnrichProgress({ done, total }),
      })
      updateProfile({ last_collection_sync_at: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ['collection'] })

      setSyncStep('wantlist')
      setEnrichProgress(null)
      const wantlistCount = await wantlistSyncMutation.mutateAsync({ userId: user.id, discogsToken, discogsUsername })
      updateProfile({ last_wantlist_sync_at: new Date().toISOString() })

      showToast('success', `✅ Sync terminée — ${count} vinyles, ${wantlistCount} envies.`)
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Erreur inconnue'
      showToast('error', `Erreur : ${msg}`)
    }
    setEnrichProgress(null)
    setSyncStep(null)
  }

  return (
    <DiscogsSyncContext.Provider value={{ handleSync, syncStep, enrichProgress }}>
      {children}

      {toast && (
        <div className={`fixed bottom-6 left-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:px-5 ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-200' : 'bg-red-900/90 text-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {showDiscogsModal && (
        <DiscogsTokenModal
          onClose={() => setShowDiscogsModal(false)}
          onSuccess={(freshValues) => { setShowDiscogsModal(false); handleSync(freshValues) }}
        />
      )}
    </DiscogsSyncContext.Provider>
  )
}

export function useDiscogsSync() {
  return useContext(DiscogsSyncContext)
}
