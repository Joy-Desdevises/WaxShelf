import { Link } from 'react-router-dom'
import Avatar from '../layout/Avatar'
import { useFollowList } from '../../hooks/useFollows'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

export default function FollowListModal({ userId, direction, onClose }) {
  useLockBodyScroll()
  const { data: list = [], isLoading } = useFollowList(userId, direction)
  const title = direction === 'followers' ? 'Abonnés' : 'Abonnements'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="safe-bottom relative flex w-full max-h-[70vh] flex-col rounded-t-2xl bg-[#111] shadow-2xl sm:max-h-[80vh] sm:max-w-sm sm:rounded-xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <div className="flex items-center justify-between border-b border-[#222] p-4">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 flex h-9 w-9 items-center justify-center text-[#999] hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-[#999]">Chargement…</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#999]">
              {direction === 'followers' ? 'Aucun abonné pour le moment.' : "Ne suit personne pour le moment."}
            </p>
          ) : (
            list.map((p) => (
              <Link
                key={p.id}
                to={`/${p.username}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#1a1a1a]"
              >
                <Avatar avatarUrl={p.avatar_url} fallbackLetter={p.username?.[0]} className="h-9 w-9 rounded-full text-sm text-white" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-white">{p.display_name || p.username}</p>
                  <p className="text-xs text-[#999]">@{p.username}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
