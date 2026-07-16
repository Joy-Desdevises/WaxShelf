import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import VinylGrid from '../components/vinyl/VinylGrid'
import VinylDetailModal from '../components/vinyl/VinylDetailModal'
import FollowListModal from '../components/modals/FollowListModal'
import { useAuth } from '../hooks/useAuth'
import { useCollectionByUsername } from '../hooks/useCollection'
import { useProfileByUsername } from '../hooks/useProfile'
import { useFollowCounts, useIsFollowing, useToggleFollow } from '../hooks/useFollows'
import { supabase } from '../lib/supabase'
import { searchDiscogs } from '../lib/discogs'
import { timeAgo } from '../lib/format'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'

// Décennie basée sur l'année de sortie originale de l'album, pas celle du
// pressage possédé (peut être une réédition tardive) — cf. DashboardPage.
function getDecades(records) {
  const decades = new Set()
  records.forEach((r) => {
    const y = r.original_year || r.year
    if (y) decades.add(Math.floor(y / 10) * 10)
  })
  return Array.from(decades).sort((a, b) => a - b)
}
function getGenres(records) {
  const genres = new Set()
  records.forEach((r) => r.genres?.forEach((g) => genres.add(g)))
  return Array.from(genres).sort()
}
function getCountries(records) {
  const countries = new Set()
  records.forEach((r) => { if (r.country) countries.add(r.country) })
  return Array.from(countries).sort()
}

export default function CollectionPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username

  const { data: collection = [], isLoading, refetch } = useCollectionByUsername(username)
  const { data: viewedProfile } = useProfileByUsername(username)
  const { data: followCounts } = useFollowCounts(viewedProfile?.id)
  const { data: isFollowing } = useIsFollowing(user?.id, viewedProfile?.id)
  const toggleFollow = useToggleFollow()

  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterDecade, setFilterDecade] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [cardSize, setCardSize] = useState('lg')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [selectedVinyl, setSelectedVinyl] = useState(null)
  const [showFollowList, setShowFollowList] = useState(null) // 'followers' | 'following' | null

  function handleToggleFollow() {
    if (!user || !viewedProfile) return
    toggleFollow.mutate({ followerId: user.id, followingId: viewedProfile.id, isFollowing: !!isFollowing })
  }

  const decades = useMemo(() => getDecades(collection), [collection])
  const genres = useMemo(() => getGenres(collection), [collection])
  const countries = useMemo(() => getCountries(collection), [collection])

  const filtered = useMemo(() => {
    return collection.filter((v) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          v.title?.toLowerCase().includes(q) ||
          v.artist?.toLowerCase().includes(q) ||
          v.styles?.some((s) => s.toLowerCase().includes(q))
        if (!matches) return false
      }
      if (filterGenre && !v.genres?.includes(filterGenre)) return false
      if (filterDecade) {
        const decade = Math.floor((v.original_year || v.year || 0) / 10) * 10
        if (decade !== parseInt(filterDecade)) return false
      }
      if (filterCountry && v.country !== filterCountry) return false
      return true
    })
  }, [collection, search, filterGenre, filterDecade, filterCountry])

  function resetFilters() {
    setSearch('')
    setFilterGenre('')
    setFilterDecade('')
    setFilterCountry('')
  }

  const hasFilters = search || filterGenre || filterDecade || filterCountry
  const activeFilterCount = [filterGenre, filterDecade, filterCountry].filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">

        {/* En-tête : titre + boutons owner */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {username}
              <span className="ml-2 text-sm font-normal text-[#999]">
                · {collection.length} vinyle{collection.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <div className="mt-1 flex gap-3 text-sm text-[#999]">
              <button onClick={() => setShowFollowList('followers')} className="hover:text-white hover:underline">
                <span className="font-semibold text-white">{followCounts?.followers ?? 0}</span> abonnés
              </button>
              <button onClick={() => setShowFollowList('following')} className="hover:text-white hover:underline">
                <span className="font-semibold text-white">{followCounts?.following ?? 0}</span> abonnements
              </button>
            </div>
            {hasFilters && (
              <p className="mt-0.5 text-sm text-[#999]">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            {isOwner && profile?.last_collection_sync_at && (
              <p className="text-[10px] text-[#888]">Dernière sync : {timeAgo(profile.last_collection_sync_at)}</p>
            )}
            {isOwner ? (
              <button
                onClick={() => setShowAddSearch(true)}
                className="flex items-center justify-center gap-1 rounded-lg bg-[#f5a623] px-3 py-2 text-sm font-medium text-black transition hover:bg-[#fbbf24] sm:px-4"
              >
                + Ajouter
              </button>
            ) : (
              user && (
                <button
                  onClick={handleToggleFollow}
                  disabled={toggleFollow.isPending}
                  className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 ${
                    isFollowing
                      ? 'border border-[#333] text-white hover:border-red-500/50 hover:text-red-400'
                      : 'bg-[#f5a623] text-black hover:bg-[#fbbf24]'
                  }`}
                >
                  {isFollowing ? 'Suivi(e) ✓' : '+ Suivre'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Barre de recherche + contrôles */}
        <div className="mb-4 flex gap-2">
          {/* Recherche — prend tout l'espace */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]">🔍</span>
            <input
              type="text"
              placeholder="Artiste, titre, style…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#222] bg-[#111] py-2.5 pl-10 pr-8 text-sm text-white placeholder-[#888] outline-none focus:border-[#333] transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-white">
                ✕
              </button>
            )}
          </div>

          {/* Bouton filtres mobile */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition sm:hidden ${
              activeFilterCount > 0
                ? 'border-[#f5a623]/50 bg-[#f5a623]/10 text-[#f5a623]'
                : 'border-[#222] bg-[#111] text-[#888]'
            }`}
          >
            ⚡ Filtres
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#f5a623] text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Toggle taille cartes */}
          <div className="flex rounded-lg border border-[#222] bg-[#111] p-0.5">
            <SizeBtn active={cardSize === 'lg'} onClick={() => setCardSize('lg')} label="⊞" title="Grande" />
            <SizeBtn active={cardSize === 'sm'} onClick={() => setCardSize('sm')} label="⊟" title="Petite" />
          </div>
        </div>

        {/* Filtres desktop (toujours visibles) + mobile (toggle) */}
        <div className={`mb-5 ${showFilters || 'hidden sm:flex'} flex flex-col gap-2 rounded-lg border border-[#1a1a1a] bg-[#111] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0`}>
          <Select value={filterGenre} onChange={setFilterGenre} placeholder="Genre" options={genres} />
          <Select
            value={filterDecade}
            onChange={setFilterDecade}
            placeholder="Décennie"
            options={decades.map((d) => ({ value: String(d), label: `${d}s` }))}
          />
          <Select value={filterCountry} onChange={setFilterCountry} placeholder="Pays" options={countries} />
          {hasFilters && (
            <button
              onClick={() => { resetFilters(); setShowFilters(false) }}
              className="rounded-lg border border-[#333] px-3 py-2 text-xs text-[#888] transition hover:border-[#555] hover:text-white"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <VinylGrid
          records={filtered}
          size={cardSize}
          loading={isLoading}
          onCardClick={(vinyl) => setSelectedVinyl(vinyl)}
          currentUserId={user?.id}
        />
      </main>

      {selectedVinyl && (
        <VinylDetailModal
          vinyl={selectedVinyl}
          isOwner={isOwner}
          onClose={() => setSelectedVinyl(null)}
        />
      )}

      {showAddSearch && (
        <AddVinylModal
          userId={user?.id}
          profileId={user?.id}
          onClose={() => setShowAddSearch(false)}
          onAdded={() => { setShowAddSearch(false); refetch() }}
        />
      )}

      {showFollowList && (
        <FollowListModal
          userId={viewedProfile?.id}
          direction={showFollowList}
          onClose={() => setShowFollowList(null)}
        />
      )}
    </div>
  )
}

// ── Utilitaires ────────────────────────────────────────────────────────────

function Select({ value, onChange, placeholder, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const normalized = options.map((o) => typeof o === 'string' ? { value: o, label: o } : o)
  const selected = normalized.find((o) => o.value === value)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(v) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm outline-none transition sm:w-auto sm:min-w-[8.5rem] ${
          value
            ? 'border-[#f5a623]/50 bg-[#f5a623]/10 text-[#f5a623]'
            : 'border-[#222] bg-[#0a0a0a] text-white sm:bg-[#111]'
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className={`text-[10px] text-[#999] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full min-w-[10rem] overflow-y-auto rounded-lg border border-[#222] bg-[#111] py-1 shadow-2xl sm:w-max">
          <button
            type="button"
            onClick={() => pick('')}
            className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-[#1a1a1a] ${!value ? 'text-[#f5a623]' : 'text-[#999]'}`}
          >
            {placeholder}
          </button>
          {normalized.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-[#1a1a1a] ${value === o.value ? 'text-[#f5a623]' : 'text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SizeBtn({ active, onClick, label, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md px-2.5 py-1.5 text-sm transition sm:px-3 ${active ? 'bg-[#f5a623] text-black' : 'text-[#999] hover:text-white'}`}
    >
      {label}
    </button>
  )
}

// ── Modal ajout manuel ─────────────────────────────────────────────────────

function AddVinylModal({ userId, profileId, onClose, onAdded }) {
  useLockBodyScroll()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState('')

  async function getToken() {
    const { data } = await supabase.from('profile_secrets').select('discogs_token').eq('user_id', profileId).maybeSingle()
    return data?.discogs_token || null
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) { setError('Configure d\'abord ton token Discogs.'); setSearching(false); return }
      const res = await searchDiscogs(token, query)
      if (res.length === 0) setError('Aucun résultat.')
      setResults(res)
    } catch (err) {
      setError(`Erreur : ${err?.response?.data?.message || err.message}`)
    }
    setSearching(false)
  }

  async function handleAdd(vinyl) {
    setAdding(vinyl.discogs_id)
    const { error: err } = await supabase.from('vinyl_records').insert({ ...vinyl, user_id: userId })
    setAdding(null)
    if (err) setError(err.message)
    else onAdded()
  }

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="safe-bottom relative flex w-full flex-col rounded-t-2xl bg-[#111] shadow-2xl sm:h-[80vh] sm:max-w-lg sm:rounded-xl">
        {/* Handle mobile */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#333] sm:hidden" />

        <div className="flex items-center justify-between border-b border-[#222] p-4">
          <h2 className="font-semibold text-white">Ajouter un vinyle</h2>
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 flex h-9 w-9 items-center justify-center text-[#999] hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artiste, titre, label…"
            className="flex-1 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-medium text-black hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {searching ? '…' : 'Chercher'}
          </button>
        </form>

        {error && (
          <p className="mx-4 mb-2 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {results.map((r) => (
            <div key={r.discogs_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#1a1a1a]">
              <img src={r.thumb_image || PLACEHOLDER} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-white">{r.title}</p>
                <p className="text-xs text-[#999]">{r.year} · {r.genres?.[0]}</p>
              </div>
              <button
                onClick={() => handleAdd(r)}
                disabled={adding === r.discogs_id}
                className="flex-shrink-0 rounded-lg bg-[#f5a623] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#fbbf24] disabled:opacity-50"
              >
                {adding === r.discogs_id ? '…' : '+ Ajouter'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
