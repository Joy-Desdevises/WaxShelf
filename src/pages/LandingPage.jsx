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

  useEffect(() => { fetchPublicUsers() }, [])

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

      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <span className="text-base font-semibold text-white tracking-tight">WaxShelf</span>
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

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-12 pt-10 text-center sm:pb-16 sm:pt-20">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-3 py-1 text-xs text-[#f5a623] sm:px-4 sm:py-1.5 sm:text-sm">
          <span>🎶</span> Tes vinyles, indexés et partagés
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Ta collection de vinyles,{' '}
          <span className="text-[#f5a623]">toujours à portée</span>
        </h1>
        <p className="mb-7 text-base text-[#888] sm:text-lg">
          Importe ta collection Discogs, explore celle des autres, et laisse WaxShelf choisir
          ce que tu devrais écouter ce soir.
        </p>
        {!user && (
          <button
            onClick={() => setShowAuth(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5a623] px-6 py-3 font-semibold text-black shadow-lg transition hover:bg-[#fbbf24] hover:scale-105 active:scale-95 sm:px-8 sm:py-3.5"
          >
            Créer mon espace
          </button>
        )}
      </section>

      {/* Utilisateurs publics */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-5 text-lg font-semibold text-white sm:text-xl">
          Collections publiques
          {!loading && <span className="ml-2 text-sm font-normal text-[#555]">· {users.length}</span>}
        </h2>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#1a1a1a] p-3 sm:p-4">
                <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-[#2a2a2a] sm:h-12 sm:w-12" />
                <div className="mx-auto h-2.5 w-14 rounded bg-[#2a2a2a]" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl">📀</p>
            <p className="mt-4 text-[#888]">Sois le premier à partager ta collection !</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {users.map((u) => <UserCard key={u.username} user={u} />)}
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
      className="group flex flex-col items-center rounded-xl border border-[#1a1a1a] bg-[#111] p-3 text-center transition hover:border-[#333] hover:bg-[#161616] sm:p-4"
    >
      <div className="mb-2 h-10 w-10 overflow-hidden rounded-full border border-[#2a2a2a] bg-[#1a1a1a] text-center text-base font-bold leading-[40px] text-[#f5a623] sm:mb-3 sm:h-12 sm:w-12 sm:text-lg sm:leading-[48px]">
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          : initials
        }
      </div>
      <p className="line-clamp-1 text-xs font-medium text-white group-hover:text-[#f5a623] transition sm:text-sm">
        {user.display_name || user.username}
      </p>
      <p className="mt-0.5 hidden text-xs text-[#555] sm:block">@{user.username}</p>
    </Link>
  )
}
