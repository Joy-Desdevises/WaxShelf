import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import Avatar from '../components/layout/Avatar'
import FollowListModal from '../components/modals/FollowListModal'
import LikesModal from '../components/modals/LikesModal'
import CommentsModal from '../components/modals/CommentsModal'
import { useCollectionByUsername } from '../hooks/useCollection'
import { useAuth } from '../hooks/useAuth'
import { useProfileByUsername } from '../hooks/useProfile'
import { useFollowCounts } from '../hooks/useFollows'
import {
  useMyLikesCount,
  useReceivedLikesCount,
  useMyCommentsCount,
  useReceivedCommentsCount,
  useReceivedLikes,
  useReceivedComments,
} from '../hooks/useSocial'
import { useRecentFollowers } from '../hooks/useNotifications'
import { formatCurrency, timeAgo } from '../lib/format'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { username } = useParams()
  const { user, profile, updateProfile } = useAuth()
  const isOwner = user && profile?.username === username

  const { data: collection = [], isLoading } = useCollectionByUsername(username)
  const { data: viewedProfile } = useProfileByUsername(username)
  const { data: followCounts } = useFollowCounts(viewedProfile?.id)
  const { data: likesGivenCount } = useMyLikesCount(viewedProfile?.id)
  const { data: likesReceivedCount } = useReceivedLikesCount(viewedProfile?.id)
  const { data: commentsLeftCount } = useMyCommentsCount(viewedProfile?.id)
  const { data: commentsReceivedCount } = useReceivedCommentsCount(viewedProfile?.id)

  // Flux "activité récente" réservé au propriétaire (likes/commentaires/
  // abonnés le concernant) — désactivé pour un visiteur via l'id undefined.
  const notifUserId = isOwner ? viewedProfile?.id : undefined
  const { data: receivedLikes = [] } = useReceivedLikes(notifUserId)
  const { data: receivedComments = [] } = useReceivedComments(notifUserId)
  const { data: recentFollowers = [] } = useRecentFollowers(notifUserId)

  const activity = useMemo(() => {
    if (!isOwner) return []
    const items = [
      ...receivedLikes.map((l) => ({ key: `like-${l.id}`, type: 'like', created_at: l.created_at, actor: l.profiles, vinyl: l.vinyl_records })),
      ...receivedComments.map((c) => ({ key: `comment-${c.id}`, type: 'comment', created_at: c.created_at, actor: c.profiles, vinyl: c.vinyl_records })),
      ...recentFollowers.map((f) => ({ key: `follow-${f.profiles?.id}-${f.created_at}`, type: 'follow', created_at: f.created_at, actor: f.profiles })),
    ]
    return items
      .filter((i) => i.actor)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15)
  }, [isOwner, receivedLikes, receivedComments, recentFollowers])

  // Marque les notifications comme vues à chaque visite de sa propre page
  // Stat & Social — remet le badge du header à zéro immédiatement (le
  // compteur dépend de ce timestamp dans sa queryKey).
  useEffect(() => {
    if (isOwner) updateProfile({ last_notifications_seen_at: new Date().toISOString() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  const [showFollowList, setShowFollowList] = useState(null) // 'followers' | 'following' | null
  const [showLikes, setShowLikes] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // ── Stats calculées ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!collection.length) return null

    const withValue = collection.filter((v) => v.average_value > 0)
    const totalValue = withValue.reduce((s, v) => s + Number(v.average_value), 0)
    const currency = withValue.find((v) => v.average_value_currency)?.average_value_currency || 'EUR'

    const genreCount = {}
    collection.forEach((v) => v.genres?.forEach((g) => { genreCount[g] = (genreCount[g] || 0) + 1 }))
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Par décennie : basé UNIQUEMENT sur l'année de sortie ORIGINALE de
    // l'album (l'époque de la musique). Un album sans original_year connu
    // est exclu de cette stat plutôt que de retomber sur l'année du pressage
    // (qui n'a rien à voir avec l'époque de la musique).
    const decadeCount = {}
    collection.forEach((v) => {
      if (v.original_year) {
        const d = `${Math.floor(v.original_year / 10) * 10}s`
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

    return { totalValue, currency, withValue: withValue.length, topGenres, decadeCount, topCountries, topValuable }
  }, [collection])

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {t('dashboardPage.title')}
            <span className="ml-2 text-sm font-normal text-[#999]">· @{username}</span>
          </h1>

          {isOwner && !isLoading && collection.length > 0 && stats?.withValue < collection.length && (
            <p className="text-xs text-[#999]">
              {t('dashboardPage.vinylsWithValue', { withValue: stats?.withValue, total: collection.length })}
            </p>
          )}
        </div>

        {/* ── Social ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SocialCard icon="👥" label={t('dashboardPage.followers')} value={followCounts?.followers ?? 0} onClick={() => setShowFollowList('followers')} />
          <SocialCard icon="➕" label={t('dashboardPage.following')} value={followCounts?.following ?? 0} onClick={() => setShowFollowList('following')} />
          <SocialCard icon="❤️" label={t('dashboardPage.likes')} value={(likesGivenCount ?? 0) + (likesReceivedCount ?? 0)} onClick={() => setShowLikes(true)} />
          <SocialCard icon="💬" label={t('dashboardPage.comments')} value={(commentsLeftCount ?? 0) + (commentsReceivedCount ?? 0)} onClick={() => setShowComments(true)} />
        </div>

        {/* ── Activité récente (propriétaire uniquement) ── */}
        {isOwner && (
          <div className="mb-6">
            <Card title={t('dashboardPage.recentActivity')}>
              {activity.length === 0 ? (
                <p className="text-sm text-[#999]">{t('dashboardPage.activityEmpty')}</p>
              ) : (
                <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
                  {activity.map((item) => (
                    <ActivityRow key={item.key} item={item} t={t} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-[#111]" />)}
          </div>
        ) : !stats ? (
          <p className="text-[#999]">{t('dashboardPage.noData')}</p>
        ) : (
          <div className="space-y-6">

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard icon="📀" label={t('dashboardPage.kpiVinyls')} value={collection.length} />
              <StatCard icon="💰" label={t('dashboardPage.kpiMinPrice')} sub={t('dashboardPage.kpiMinPriceSub')} value={stats.totalValue > 0 ? `~${formatCurrency(Math.round(stats.totalValue), stats.currency)}` : '—'} />
              <StatCard icon="🌍" label={t('dashboardPage.kpiCountries')} value={Object.keys(stats.decadeCount).length > 0 ? stats.topCountries.length : '—'} />
            </div>

            {/* ── Valeur : top 10 les plus chers ── */}
            {stats.topValuable.length > 0 && (
              <Card title={t('dashboardPage.mostPrecious')}>
                <p className="-mt-2 mb-3 text-xs text-[#999]">{t('dashboardPage.mostPreciousSub')}</p>
                <div className="space-y-2">
                  {stats.topValuable.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-xs text-[#888]">{i + 1}</span>
                      <img src={v.thumb_image || PLACEHOLDER} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-white">{v.title}</p>
                        <p className="text-xs text-[#999]">{v.artist}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#f5a623]">~{formatCurrency(v.average_value, v.average_value_currency)}</p>
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
                <Card title={t('dashboardPage.topGenres')}>
                  <div className="space-y-3">
                    {stats.topGenres.map(([genre, count]) => (
                      <Bar key={genre} label={genre} count={count} max={stats.topGenres[0][1]} />
                    ))}
                  </div>
                </Card>
              )}

              {Object.keys(stats.decadeCount).length > 0 && (
                <Card title={t('dashboardPage.byDecade')}>
                  <p className="-mt-2 mb-3 text-xs text-[#999]">{t('dashboardPage.byDecadeSub')}</p>
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
              <Card title={t('dashboardPage.originCountries')}>
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

      {showFollowList && (
        <FollowListModal
          userId={viewedProfile?.id}
          direction={showFollowList}
          onClose={() => setShowFollowList(null)}
        />
      )}

      {showLikes && (
        <LikesModal userId={viewedProfile?.id} onClose={() => setShowLikes(false)} />
      )}

      {showComments && (
        <CommentsModal userId={viewedProfile?.id} onClose={() => setShowComments(false)} />
      )}
    </div>
  )
}

// ── Composants ────────────────────────────────────────────────────────────────

function SocialCard({ icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-[#1a1a1a] bg-[#111] p-4 text-left transition hover:border-[#333] sm:p-5"
    >
      <div className="mb-2 text-xl sm:text-2xl">{icon}</div>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-[#999]">{label}</p>
    </button>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-4 sm:p-5">
      <div className="mb-2 text-xl sm:text-2xl">{icon}</div>
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-[#999]">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#888]">{sub}</p>}
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

function ActivityRow({ item, t }) {
  const { actor, type, vinyl, created_at } = item
  const name = actor.display_name || actor.username

  let text
  if (type === 'like') text = t('dashboardPage.activityLike', { name, title: vinyl?.title })
  else if (type === 'comment') text = t('dashboardPage.activityComment', { name, title: vinyl?.title })
  else text = t('dashboardPage.activityFollow', { name })

  return (
    <Link to={`/${actor.username}`} className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition hover:bg-[#1a1a1a]">
      <Avatar avatarUrl={actor.avatar_url} fallbackLetter={actor.username?.[0]} className="h-8 w-8 shrink-0 rounded-full text-xs text-white" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm text-white">{text}</p>
      </div>
      <span className="shrink-0 text-xs text-[#888]">{timeAgo(created_at)}</span>
    </Link>
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
