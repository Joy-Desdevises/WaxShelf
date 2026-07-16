import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useSyncDiscogs } from './useCollection'
import { useSyncWantlist } from './useWantlist'
import { supabase } from '../lib/supabase'

// Logique de synchronisation Discogs (collection + wantlist), partagée entre
// tous les boutons qui déclenchent un sync (header, page d'accueil...) pour
// qu'ils se comportent tous exactement pareil sans dupliquer le flux.
export function useDiscogsSync() {
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
        .from('profiles')
        .select('discogs_token, discogs_username')
        .eq('id', user.id)
        .single()
      discogsToken = data?.discogs_token
      discogsUsername = data?.discogs_username
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

  return {
    handleSync,
    syncStep,
    enrichProgress,
    toast,
    showDiscogsModal,
    setShowDiscogsModal,
  }
}
