import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Avatar from '../layout/Avatar'
import { useMyLikes, useReceivedLikes } from '../../hooks/useSocial'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function LikesModal({ userId, onClose }) {
  useLockBodyScroll()
  const { t } = useTranslation()
  const [tab, setTab] = useState('given') // 'given' | 'received'

  const { data: givenList = [], isLoading: givenLoading } = useMyLikes(userId)
  const { data: receivedList = [], isLoading: receivedLoading } = useReceivedLikes(userId)

  const list = tab === 'given' ? givenList : receivedList
  const isLoading = tab === 'given' ? givenLoading : receivedLoading

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="safe-bottom relative flex w-full max-h-[70vh] flex-col rounded-t-2xl bg-[#111] shadow-2xl sm:max-h-[80vh] sm:max-w-sm sm:rounded-xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <div className="flex items-center justify-between border-b border-[#222] p-4">
          <h2 className="font-semibold text-white">{t('likesModal.title')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="-mr-2 flex h-9 w-9 items-center justify-center text-[#999] hover:text-white">✕</button>
        </div>

        <div className="flex border-b border-[#222] px-4 pt-2">
          <TabButton active={tab === 'given'} onClick={() => setTab('given')}>
            {t('likesModal.given')} · {givenList.length}
          </TabButton>
          <TabButton active={tab === 'received'} onClick={() => setTab('received')}>
            {t('likesModal.received')} · {receivedList.length}
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-[#999]">{t('likesModal.loading')}</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#999]">
              {tab === 'given' ? t('likesModal.emptyGiven') : t('likesModal.emptyReceived')}
            </p>
          ) : tab === 'given' ? (
            givenList.map(({ id, vinyl_records: v }) => (
              <Link
                key={id}
                to={`/${v.profiles?.username}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#1a1a1a]"
              >
                <img src={v.thumb_image || v.cover_image || PLACEHOLDER} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-white">{v.title}</p>
                  <p className="line-clamp-1 text-xs text-[#999]">{v.artist} · @{v.profiles?.username}</p>
                </div>
              </Link>
            ))
          ) : (
            receivedList.map(({ id, profiles: p, vinyl_records: v }) => (
              <Link
                key={id}
                to={`/${p?.username || ''}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#1a1a1a]"
              >
                <Avatar avatarUrl={p?.avatar_url} fallbackLetter={p?.username?.[0]} className="h-9 w-9 shrink-0 rounded-full text-sm text-white" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-white">@{p?.username}</p>
                  <p className="line-clamp-1 text-xs text-[#999]">{v.title} · {v.artist}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 pb-2 text-sm font-medium transition ${
        active ? 'border-[#f5a623] text-white' : 'border-transparent text-[#888] hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
