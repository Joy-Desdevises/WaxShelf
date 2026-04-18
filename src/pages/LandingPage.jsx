import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/modals/AuthModal'
import { useAuth } from '../hooks/useAuth'

export default function LandingPage() {
  const { user, profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    fetchPublicUsers()
  }, [])

  async function fetchPublicUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)
    setUsers(data || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* ── Nav ── */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="text-lg font-semibold text-white tracking-tight">WaxShelf</span>
        </div>
        {user && profile ? (
          <Link
            to={`/${profile.username}`}
            className="rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-medium text-black hover:bg-[#fbbf24]"
          >
            Ma collection
          </Link>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="rounded-lg border border-[#333] px-4 py-2 text-sm text-white hover:border-[#555] hover:bg-[#1a1a1a]"
          >
            Connexion
          </button>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-4 py-1.5 text-sm text-[#f5a623]">
          <span>🎶</span> Tes vinyles, indexés et partagés
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
          Ta collection de vinyles,{' '}
          <span className="text-[#f5a623]">toujours à portée</span>
        </h1>
        <p className="mb-8 text-lg text-[#888]">
          Importe ta collection Discogs, explore celle des autres, et laisse WaxShelf choisir
          ce que tu devrais écouter ce soir.
        </p>
        {!user && (
          <button
            onClick={() => setShowAuth(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5a623] px-8 py-3.5 font-semibold text-black shadow-lg transition hover:bg-[#fbbf24] hover:scale-105 active:scale-95"
          >
            Créer mon espace
          </button>
        )}
      </section>

      {/* ── Utilisateurs publics ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <h2 className="mb-6 text-xl font-semibold text-white">
          Collections publiques
          {!loading && <span className="ml-2 text-base font-normal text-[#555]">· {users.length}</span>}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#1a1a1a] p-4">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#2a2a2a]" />
                <div className="mx-auto h-3 w-20 rounded bg-[#2a2a2a]" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[#555]">
            <p className="text-5xl">📀</p>
            <p className="mt-4 text-[#888]">Sois le premier à partager ta collection !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {users.map((u) => (
              <UserCard key={u.username} user={u} />
            ))}
          </div>
        )}
      </section>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

function UserCard({ user }) {
  const initials = (user.display_name || user.username || '?')[0].toUpperCase()
  return (
    <Link
      to={`/${user.username}`}
      className="group flex flex-col items-center rounded-xl border border-[#1a1a1a] bg-[#111] p-4 text-center transition hover:border-[#333] hover:bg-[#161616]"
    >
      <div className="mb-3 h-12 w-12 overflow-hidden rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-center text-lg font-bold leading-[48px] text-[#f5a623]">
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          : initials
        }
      </div>
      <p className="line-clamp-1 text-sm font-medium text-white group-hover:text-[#f5a623] transition">
        {user.display_name || user.username}
      </p>
      <p className="mt-0.5 text-xs text-[#555]">@{user.username}</p>
    </Link>
  )
}
