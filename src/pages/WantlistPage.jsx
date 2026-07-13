import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { useWantlistItems } from '../hooks/useWantlist'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/format'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function WantlistPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username

  const { data: items = [], isLoading, refetch } = useWantlistItems(username)

  async function handleRemove(itemId) {
    await supabase.from('wantlist_items').delete().eq('id', itemId)
    refetch()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Wantlist
            <span className="ml-2 text-sm font-normal text-[#999]">· @{username}</span>
          </h1>
          {isOwner && profile?.last_wantlist_sync_at && (
            <p className="text-[10px] text-[#888]">Dernière sync : {timeAgo(profile.last_wantlist_sync_at)}</p>
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
              <p className="mt-1 text-sm text-[#999]">
                Clique sur "Sync Discogs" en haut de page pour importer tes envies.
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
                  <p className="text-sm text-[#999]">
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
