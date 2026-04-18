import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import VinylGrid from '../components/vinyl/VinylGrid'
import DiscogsTokenModal from '../components/modals/DiscogsTokenModal'
import { useAuth } from '../hooks/useAuth'
import { useCollectionByUsername, useSyncDiscogs } from '../hooks/useCollection'
import { supabase } from '../lib/supabase'
import { searchDiscogs } from '../lib/discogs'

// ── Décades disponibles ──────────────────────────────────────────────────────
function getDecades(records) {
  const decades = new Set()
  records.forEach((r) => {
    if (r.year) decades.add(Math.floor(r.year / 10) * 10)
  })
  return Array.from(decades).sort((a, b) => a - b)
}

// ── Genres disponibles ───────────────────────────────────────────────────────
function getGenres(records) {
  const genres = new Set()
  records.forEach((r) => r.genres?.forEach((g) => genres.add(g)))
  return Array.from(genres).sort()
}

// ── Pays disponibles ─────────────────────────────────────────────────────────
function getCountries(records) {
  const countries = new Set()
  records.forEach((r) => { if (r.country) countries.add(r.country) })
  return Array.from(countries).sort()
}

// ────────────────────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username

  // Données
  const { data: collection = [], isLoading, refetch } = useCollectionByUsername(username)

  // Filtres
  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterDecade, setFilterDecade] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [cardSize, setCardSize] = useState('lg')

  // UI
  const [showDiscogsModal, setShowDiscogsModal] = useState(false)
  const [showAddSearch, setShowAddSearch] = useState(false)

  // Sync
  const syncMutation = useSyncDiscogs()

  // Dérivés
  const decades = useMemo(() => getDecades(collection), [collection])
  const genres = useMemo(() => getGenres(collection), [collection])
  const countries = useMemo(() => getCountries(collection), [collection])

  const filtered = useMemo(() => {
    return collection.filter((v) => {
      // Recherche texte
      if (search) {
        const q = search.toLowerCase()
        const matches =
          v.title?.toLowerCase().includes(q) ||
          v.artist?.toLowerCase().includes(q) ||
          v.styles?.some((s) => s.toLowerCase().includes(q))
        if (!matches) return false
      }
      // Genre
      if (filterGenre && !v.genres?.includes(filterGenre)) return false
      // Décennie
      if (filterDecade) {
        const decade = Math.floor((v.year || 0) / 10) * 10
        if (decade !== parseInt(filterDecade)) return false
      }
      // Pays
      if (filterCountry && v.country !== filterCountry) return false
      return true
    })
  }, [collection, search, filterGenre, filterDecade, filterCountry])

  async function handleSync() {
    if (!profile?.discogs_token) {
      setShowDiscogsModal(true)
      return
    }
    try {
      const count = await syncMutation.mutateAsync({
        userId: user.id,
        discogsToken: profile.discogs_token,
        discogsUsername: profile.discogs_username,
      })
      alert(`✅ Sync terminée — ${count} vinyles importés.`)
      refetch()
    } catch (err) {
      alert(`Erreur lors de la sync : ${err.message}`)
    }
  }

  const hasFilters = search || filterGenre || filterDecade || filterCountry

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header collection={collection} />

      <main className="mx-auto max-w-7xl px-4 py-8">

        {/* ── En-tête de la collection ── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {username}
              <span className="ml-2 text-base font-normal text-[#555]">
                · {collection.length} vinyle{collection.length !== 1 ? 's' : ''}
              </span>
            </h1>
            {hasFilters && (
              <p className="mt-1 text-sm text-[#555]">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Actions propriétaire */}
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-4 py-2 text-sm text-white transition hover:border-[#f5a623]/60 hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                <span className={syncMutation.isPending ? 'animate-spin' : ''}>🔄</span>
                {syncMutation.isPending ? 'Sync en cours…' : 'Sync Discogs'}
              </button>
              <button
                onClick={() => setShowAddSearch(true)}
                className="flex items-center gap-2 rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#fbbf24]"
              >
                + Ajouter un vinyle
              </button>
            </div>
          )}
        </div>

        {/* ── Barre de recherche + filtres ── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Recherche */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">🔍</span>
            <input
              type="text"
              placeholder="Rechercher artiste, titre, style…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#222] bg-[#111] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#444] outline-none focus:border-[#333] transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
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
                onClick={() => { setSearch(''); setFilterGenre(''); setFilterDecade(''); setFilterCountry('') }}
                className="rounded-lg border border-[#333] px-3 py-2 text-xs text-[#888] transition hover:border-[#555] hover:text-white"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Taille des cartes */}
          <div className="flex rounded-lg border border-[#222] bg-[#111] p-0.5">
            <SizeBtn active={cardSize === 'lg'} onClick={() => setCardSize('lg')} label="⊞" title="Grande taille" />
            <SizeBtn active={cardSize === 'sm'} onClick={() => setCardSize('sm')} label="⊟" title="Petite taille" />
          </div>
        </div>

        {/* ── Grille ── */}
        <VinylGrid records={filtered} size={cardSize} loading={isLoading} />

      </main>

      {/* Modals */}
      {showDiscogsModal && (
        <DiscogsTokenModal
          onClose={() => setShowDiscogsModal(false)}
          onSuccess={handleSync}
        />
      )}

      {showAddSearch && (
        <AddVinylModal
          userId={user?.id}
          discogsToken={profile?.discogs_token}
          onClose={() => setShowAddSearch(false)}
          onAdded={() => { setShowAddSearch(false); refetch() }}
        />
      )}
    </div>
  )
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function Select({ value, onChange, placeholder, options }) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  )
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#333] transition cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function SizeBtn({ active, onClick, label, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active ? 'bg-[#f5a623] text-black' : 'text-[#555] hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

// ── Modal ajout manuel ────────────────────────────────────────────────────────

function AddVinylModal({ userId, discogsToken, onClose, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [error, setError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    if (!discogsToken) { setError('Configure d\'abord ton token Discogs.'); return }
    setSearching(true)
    setError('')
    try {
      const res = await searchDiscogs(discogsToken, query)
      setResults(res)
    } catch (err) {
      setError(`Erreur Discogs : ${err.message}`)
    }
    setSearching(false)
  }

  async function handleAdd(vinyl) {
    setAdding(vinyl.discogs_id)
    const { error: err } = await supabase
      .from('vinyl_records')
      .insert({ ...vinyl, user_id: userId })
    setAdding(null)
    if (err) setError(err.message)
    else onAdded()
  }

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex h-[80vh] w-full max-w-lg flex-col rounded-xl bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#222] p-4">
          <h2 className="font-semibold text-white">Ajouter un vinyle</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artiste, titre, label…"
            className="flex-1 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-medium text-black hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {searching ? '…' : 'Chercher'}
          </button>
        </form>

        {error && <p className="px-4 text-sm text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {results.map((r) => (
            <div key={r.discogs_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#1a1a1a]">
              <img
                src={r.thumb_image || PLACEHOLDER}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-white">{r.title}</p>
                <p className="text-xs text-[#555]">{r.year} · {r.genres?.[0]}</p>
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
