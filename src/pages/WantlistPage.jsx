import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchWantlist } from '../lib/discogs'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function WantlistPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username
  const qc = useQueryClient()

  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)

  const { data: profileData } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single()
      return data
    },
    enabled: !!username,
  })

  const { data: items = [], isLoading } = useQuery({
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

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleSync() {
    // Récupère le token frais depuis Supabase
    const { data: prof } = await supabase
      .from('profiles')
      .select('discogs_token, discogs_username')
      .eq('id', user.id)
      .single()

    if (!prof?.discogs_token) {
      showToast('error', 'Configure d\'abord ton token Discogs dans les paramètres.')
      return
    }

    setSyncing(true)
    try {
      const wants = await fetchWantlist(prof.discogs_token, prof.discogs_username)

      // Upsert par lots
      const records = wants.map((w) => ({ ...w, user_id: user.id }))
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

      qc.invalidateQueries({ queryKey: ['wantlist', username] })
      showToast('success', `✅ Wantlist synchronisée — ${wants.length} vinyles.`)
    } catch (err) {
      showToast('error', `Erreur : ${err?.response?.data?.message || err.message}`)
    }
    setSyncing(false)
  }

  async function handleRemove(itemId) {
    await supabase.from('wantlist_items').delete().eq('id', itemId)
    qc.invalidateQueries({ queryKey: ['wantlist', username] })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      {toast && (
        <div className={`fixed bottom-6 left-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:px-5 ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-200' : 'bg-red-900/90 text-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Wantlist
            <span className="ml-2 text-sm font-normal text-[#555]">· @{username}</span>
          </h1>
          {isOwner && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-4 py-2 text-sm text-white transition hover:border-[#f5a623]/60 hover:bg-[#1a1a1a] disabled:opacity-50"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
              {syncing ? 'Sync…' : 'Sync Discogs'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[#111]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-5xl">🎵</p>
            <p className="mt-4 text-[#888]">La wantlist est vide.</p>
            {isOwner && (
              <p className="mt-1 text-sm text-[#555]">
                Clique sur "Sync Discogs" pour importer tes envies.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#111] p-3 transition hover:border-[#2a2a2a]"
              >
                <img
                  src={item.thumb_image || PLACEHOLDER}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium text-white">{item.title}</p>
                  <p className="text-sm text-[#555]">
                    {item.artist}{item.year ? ` · ${item.year}` : ''}
                  </p>
                </div>
                <a
                  href={`https://www.discogs.com/release/${item.discogs_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#888] transition hover:border-[#444] hover:text-white"
                >
                  Discogs ↗
                </a>
                {isOwner && (
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-[#888] transition hover:border-red-500/40 hover:text-red-400"
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
