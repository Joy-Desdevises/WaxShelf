import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { useJournal, useJournalStats } from '../hooks/usePlayLog'
import { supabase } from '../lib/supabase'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function JournalPage() {
  const { username } = useParams()
  const { user, profile } = useAuth()
  const isOwner = user && profile?.username === username
  const qc = useQueryClient()

  const { data: profileData } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single()
      return data
    },
    enabled: !!username,
  })

  const userId = profileData?.id
  const { data: logs = [], isLoading } = useJournal(userId)
  const { data: stats } = useJournalStats(userId)

  const deleteLog = useMutation({
    mutationFn: async (logId) => {
      const { error } = await supabase.from('play_logs').delete().eq('id', logId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', userId] })
      qc.invalidateQueries({ queryKey: ['journalStats', userId] })
    },
  })

  // Grouper les écoutes par jour
  const grouped = groupByDay(logs)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* ── Titre ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Journal d'écoute</h1>
          <p className="mt-1 text-sm text-[#555]">
            {isOwner ? "Toutes tes sessions d'écoute" : `Les écoutes de @${username}`}
          </p>
        </div>

        {/* ── Stats ── */}
        {stats && stats.total > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-3">
            <StatCard label="Total écoutes" value={stats.total} />
            <StatCard label="Cette semaine" value={stats.thisWeek} />
            <StatCard
              label="Le plus joué"
              value={stats.mostPlayed?.vinyl?.title ?? '—'}
              sub={stats.mostPlayed ? `${stats.mostPlayed.count} fois` : null}
              small
            />
          </div>
        )}

        {/* ── Liste ── */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f5a623] border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#111] py-16 text-center">
            <p className="text-4xl">🎵</p>
            <p className="mt-4 text-[#555]">
              {isOwner
                ? "Aucune écoute pour l'instant. Ouvre un vinyle et clique sur 'J'écoute ça' !"
                : "Aucune écoute enregistrée."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ day, entries }) => (
              <div key={day}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#444]">
                  {formatDay(day)}
                </h2>
                <div className="space-y-2">
                  {entries.map((log) => (
                    <LogEntry
                      key={log.id}
                      log={log}
                      isOwner={isOwner}
                      onDelete={() => deleteLog.mutate(log.id)}
                      deleting={deleteLog.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function LogEntry({ log, isOwner, onDelete, deleting }) {
  const v = log.vinyl_records
  if (!v) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#111] px-4 py-3 transition hover:border-[#2a2a2a]">
      <img
        src={v.cover_image || v.thumb_image || PLACEHOLDER}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{v.title}</p>
        <p className="truncate text-xs text-[#555]">{v.artist}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#444]">
          {new Date(log.played_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOwner && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-[10px] text-[#333] transition hover:text-red-400 disabled:opacity-40"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, small }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] px-4 py-4">
      <p className="text-xs text-[#555]">{label}</p>
      <p className={`mt-1 font-bold text-white ${small ? 'truncate text-sm' : 'text-2xl'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#f5a623]">{sub}</p>}
    </div>
  )
}

function groupByDay(logs) {
  const map = {}
  for (const log of logs) {
    const day = new Date(log.played_at).toISOString().slice(0, 10)
    if (!map[day]) map[day] = []
    map[day].push(log)
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, entries]) => ({ day, entries }))
}

function formatDay(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isoDate === today.toISOString().slice(0, 10)) return "Aujourd'hui"
  if (isoDate === yesterday.toISOString().slice(0, 10)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
