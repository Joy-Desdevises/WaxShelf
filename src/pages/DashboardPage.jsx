import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import { useCollectionByUsername } from '../hooks/useCollection'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { refreshCollectionValues } from '../lib/discogs'

export default function DashboardPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username
  const qc = useQueryClient()

  const { data: collection = [], isLoading } = useCollectionByUsername(username)

  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState(null) // { done, total }
  const [toast, setToast] = useState(null)

  // ── Stats calculées ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!collection.length) return null

    const withValue = collection.filter((v) => v.average_value > 0)
    const totalValue = withValue.reduce((s, v) => s + Number(v.average_value), 0)

    const genreCount = {}
    collection.forEach((v) => v.genres?.forEach((g) => { genreCount[g] = (genreCount[g] || 0) + 1 }))
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    const decadeCount = {}
    collection.forEach((v) => {
      if (v.year) {
        const d = `${Math.floor(v.year / 10) * 10}s`
        decadeCount[d] = (decadeCount[d] || 0) + 1
      }
    })

    const countryCount = {}
    collection.forEach((v) => {
      if (v.country) countryCount[v.country] = (countryCount[v.country] || 0) + 1
    })
    const topCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const topValuable = [...withValue]
      .sort((a, b) => Number(b.average_value) - Number(a.average_value))
      .slice(0, 10)

    const ratedCount = collection.filter((v) => v.rating > 0).length
    const avgRating = ratedCount
      ? (collection.filter((v) => v.rating).reduce((s, v) => s + v.rating, 0) / ratedCount).toFixed(1)
      : null

    return { totalValue, withValue: withValue.length, topGenres, decadeCount, topCountries, topValuable, ratedCount, avgRating }
  }, [collection])

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 6000)
  }

  async function handleRefreshValues() {
    const { data: prof } = await supabase
      .from('profiles')
      .select('discogs_token')
      .eq('id', user.id)
      .single()

    if (!prof?.discogs_token) {
      showToast('error', 'Configure d\'abord ton token Discogs dans les paramètres.')
      return
    }

    const withDiscogs = collection.filter((v) => v.discogs_id)
    if (withDiscogs.length === 0) {
      showToast('error', 'Aucun vinyle avec un ID Discogs trouvé.')
      return
    }

    setRefreshing(true)
    setProgress({ done: 0, total: withDiscogs.length })

    try {
      const results = await refreshCollectionValues(
        prof.discogs_token,
        withDiscogs,
        (done, total) => setProgress({ done, total })
      )

      // Mise à jour en base par lots
      const BATCH = 50
      for (let i = 0; i < results.length; i += BATCH) {
        await Promise.all(
          results.slice(i, i + BATCH).map(({ id, average_value }) =>
            supabase.from('vinyl_records').update({ average_value }).eq('id', id)
          )
        )
      }

      qc.invalidateQueries({ queryKey: ['collection', 'public', username] })
      showToast('success', `✅ ${results.filter((r) => r.average_value).length} valeurs mises à jour.`)
    } catch (err) {
      showToast('error', `Erreur : ${err.message}`)
    }

    setRefreshing(false)
    setProgress(null)
  }

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header collection={collection} />

      {toast && (
        <div className={`fixed bottom-6 left-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:px-5 ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-200' : 'bg-red-900/90 text-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Statistiques
            <span className="ml-2 text-sm font-normal text-[#555]">· @{username}</span>
          </h1>

          {/* Bouton refresh valeurs (owner uniquement) */}
          {isOwner && !isLoading && collection.length > 0 && (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleRefreshValues}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-4 py-2 text-sm text-white transition hover:border-[#f5a623]/50 hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                <span className={refreshing ? 'animate-spin inline-block' : ''}>💰</span>
                {refreshing ? `Récup. valeurs… (${progress?.done}/${progress?.total})` : 'Actualiser les valeurs'}
              </button>
              {refreshing && progress && (
                <div className="h-1 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div
                    className="h-full rounded-full bg-[#f5a623] transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              )}
              {!refreshing && stats?.withValue < collection.length && (
                <p className="text-xs text-[#555]">
                  {stats?.withValue}/{collection.length} vinyles avec une valeur connue
                  {collection.filter(v => v.discogs_id).length > 0 &&
                    ` · ~${Math.ceil(collection.filter(v => v.discogs_id).length * 1.1 / 60)} min pour tout actualiser`}
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-[#111]" />)}
          </div>
        ) : !stats ? (
          <p className="text-[#555]">Aucune donnée disponible.</p>
        ) : (
          <div className="space-y-6">

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="📀" label="Vinyles" value={collection.length} />
              <StatCard icon="💰" label="Valeur estimée" value={stats.totalValue > 0 ? `~${Math.round(stats.totalValue)}€` : '—'} />
              <StatCard icon="⭐" label="Note moyenne" value={stats.avgRating ? `${stats.avgRating}/5` : '—'} sub={stats.ratedCount > 0 ? `${stats.ratedCount} notés` : 'Aucune note'} />
              <StatCard icon="🌍" label="Pays différents" value={Object.keys(stats.decadeCount).length > 0 ? stats.topCountries.length : '—'} />
            </div>

            {/* ── Valeur : top 10 les plus chers ── */}
            {stats.topValuable.length > 0 && (
              <Card title="💰 Les plus précieux">
                <div className="space-y-2">
                  {stats.topValuable.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-xs text-[#444]">{i + 1}</span>
                      <img src={v.thumb_image || PLACEHOLDER} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-white">{v.title}</p>
                        <p className="text-xs text-[#555]">{v.artist}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#f5a623]">~{v.average_value}€</p>
                      </div>
                      {/* Barre proportionnelle */}
                      <div className="hidden w-20 sm:block">
                        <div className="h-1 overflow-hidden rounded-full bg-[#1a1a1a]">
                          <div
                            className="h-full rounded-full bg-[#f5a623]/60"
                            style={{ width: `${(Number(v.average_value) / Number(stats.topValuable[0].average_value)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Genres + Décennies ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              {stats.topGenres.length > 0 && (
                <Card title="🎸 Top genres">
                  <div className="space-y-3">
                    {stats.topGenres.map(([genre, count]) => (
                      <Bar key={genre} label={genre} count={count} max={stats.topGenres[0][1]} />
                    ))}
                  </div>
                </Card>
              )}

              {Object.keys(stats.decadeCount).length > 0 && (
                <Card title="📅 Par décennie">
                  <div className="space-y-3">
                    {Object.entries(stats.decadeCount).sort().map(([decade, count]) => (
                      <Bar key={decade} label={decade} count={count} max={Math.max(...Object.values(stats.decadeCount))} />
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* ── Pays ── */}
            {stats.topCountries.length > 0 && (
              <Card title="🌍 Pays d'origine">
                <div className="flex flex-wrap gap-2">
                  {stats.topCountries.map(([country, count]) => (
                    <span key={country} className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-sm">
                      <span className="text-[#888]">{country}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-4 sm:p-5">
      <div className="mb-2 text-xl sm:text-2xl">{icon}</div>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-[#555]">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#444]">{sub}</p>}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}

function Bar({ label, count, max }) {
  const pct = Math.round((count / max) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#888]">{label}</span>
        <span className="font-medium text-white">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
        <div className="h-full rounded-full bg-[#f5a623] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
