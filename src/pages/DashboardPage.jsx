import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import { useCollectionByUsername } from '../hooks/useCollection'

export default function DashboardPage() {
  const { username } = useParams()
  const { data: collection = [], isLoading } = useCollectionByUsername(username)

  const stats = useMemo(() => {
    if (!collection.length) return null
    const totalValue = collection.reduce((sum, v) => sum + (v.average_value || 0), 0)
    const withValue = collection.filter((v) => v.average_value > 0)
    const genreCount = {}
    collection.forEach((v) => v.genres?.forEach((g) => { genreCount[g] = (genreCount[g] || 0) + 1 }))
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const decades = {}
    collection.forEach((v) => {
      if (v.year) {
        const d = `${Math.floor(v.year / 10) * 10}s`
        decades[d] = (decades[d] || 0) + 1
      }
    })

    const countries = {}
    collection.forEach((v) => {
      if (v.country) countries[v.country] = (countries[v.country] || 0) + 1
    })
    const topCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { totalValue, withValue: withValue.length, topGenres, decades, topCountries }
  }, [collection])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header collection={collection} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-white">
          Statistiques · <span className="text-[#888] font-normal">{username}</span>
        </h1>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#111] p-6 h-28" />
            ))}
          </div>
        ) : !stats ? (
          <p className="text-[#555]">Aucune donnée disponible.</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Vinyles" value={collection.length} icon="📀" />
              <StatCard label="Valeur estimée" value={`~${stats.totalValue.toFixed(0)}€`} icon="💰" />
              <StatCard label="Avec valeur connue" value={`${stats.withValue} vinyles`} icon="📊" />
              <StatCard label="Genres uniques" value={stats.topGenres.length} icon="🎸" />
            </div>

            {/* Top genres */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <ChartCard title="Top genres">
                {stats.topGenres.map(([genre, count]) => (
                  <Bar key={genre} label={genre} count={count} max={stats.topGenres[0][1]} />
                ))}
              </ChartCard>

              <ChartCard title="Par décennie">
                {Object.entries(stats.decades).sort().map(([d, count]) => (
                  <Bar key={d} label={d} count={count} max={Math.max(...Object.values(stats.decades))} />
                ))}
              </ChartCard>
            </div>

            <ChartCard title="Top pays d'origine">
              <div className="flex flex-wrap gap-2">
                {stats.topCountries.map(([country, count]) => (
                  <span key={country} className="rounded-full bg-[#1a1a1a] px-3 py-1 text-sm text-[#888]">
                    {country} <span className="ml-1 text-white">{count}</span>
                  </span>
                ))}
              </div>
            </ChartCard>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-[#555]">{label}</p>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
      <h3 className="mb-4 font-medium text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Bar({ label, count, max }) {
  const pct = Math.round((count / max) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[#888]">{label}</span>
        <span className="text-white">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a1a1a]">
        <div
          className="h-full rounded-full bg-[#f5a623] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
