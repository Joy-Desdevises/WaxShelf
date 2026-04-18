import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export default function WantlistPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wantlist', username],
    queryFn: async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
      if (!prof) return []
      const { data, error } = await supabase
        .from('wantlist_items')
        .select('*')
        .eq('user_id', prof.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!username,
  })

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">
          Wantlist · <span className="text-[#888] font-normal">{username}</span>
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#111] h-20" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center text-[#555]">
            <p className="text-5xl">🎵</p>
            <p className="mt-4 text-[#888]">La wantlist est vide.</p>
            {isOwner && <p className="mt-1 text-sm">Ajoute des vinyles depuis Discogs pour les retrouver ici.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-[#1a1a1a] bg-[#111] p-3 hover:border-[#2a2a2a] transition">
                <img
                  src={item.thumb_image || PLACEHOLDER}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium text-white">{item.title}</p>
                  <p className="text-sm text-[#555]">{item.artist} {item.year ? `· ${item.year}` : ''}</p>
                </div>
                {isOwner && (
                  <RemoveButton userId={user.id} itemId={item.id} username={username} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function RemoveButton({ userId, itemId, username }) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  async function remove() {
    setLoading(true)
    await supabase.from('wantlist_items').delete().eq('id', itemId)
    queryClient.invalidateQueries({ queryKey: ['wantlist', username] })
    setLoading(false)
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      className="flex-shrink-0 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#888] transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
    >
      {loading ? '…' : 'Retirer'}
    </button>
  )
}
