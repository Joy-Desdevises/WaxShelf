import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Avatar from '../layout/Avatar'
import { useMyComments, useReceivedComments } from '../../hooks/useSocial'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function CommentsModal({ userId, onClose }) {
  useLockBodyScroll()
  const { t } = useTranslation()
  const [tab, setTab] = useState('left') // 'left' | 'received'

  const { data: leftList = [], isLoading: leftLoading } = useMyComments(userId)
  const { data: receivedList = [], isLoading: receivedLoading } = useReceivedComments(userId)

  const list = tab === 'left' ? leftList : receivedList
  const isLoading = tab === 'left' ? leftLoading : receivedLoading

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="safe-bottom relative flex w-full max-h-[70vh] flex-col rounded-t-2xl bg-[#111] shadow-2xl sm:max-h-[80vh] sm:max-w-sm sm:rounded-xl">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <div className="flex items-center justify-between border-b border-[#222] p-4">
          <h2 className="font-semibold text-white">{t('commentsModal.title')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="-mr-2 flex h-9 w-9 items-center justify-center text-[#999] hover:text-white">✕</button>
        </div>

        <div className="flex border-b border-[#222] px-4 pt-2">
          <TabButton active={tab === 'left'} onClick={() => setTab('left')}>
            {t('commentsModal.left')} · {leftList.length}
          </TabButton>
          <TabButton active={tab === 'received'} onClick={() => setTab('received')}>
            {t('commentsModal.received')} · {receivedList.length}
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-[#999]">{t('commentsModal.loading')}</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#999]">
              {tab === 'left' ? t('commentsModal.emptyLeft') : t('commentsModal.emptyReceived')}
            </p>
          ) : (
            list.map((c) => (
              <Link
                key={c.id}
                to={`/${c.vinyl_records.profiles?.username || ''}`}
                onClick={onClose}
                className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-[#1a1a1a]"
              >
                {tab === 'received' ? (
                  <Avatar avatarUrl={c.profiles?.avatar_url} fallbackLetter={c.profiles?.username?.[0]} className="h-9 w-9 shrink-0 rounded-full text-sm text-white" />
                ) : (
                  <img src={c.vinyl_records.thumb_image || c.vinyl_records.cover_image || PLACEHOLDER} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs text-[#999]">
                    {tab === 'received'
                      ? t('commentsModal.receivedFrom', { username: c.profiles?.username, vinyl: c.vinyl_records.title })
                      : t('commentsModal.leftOn', { vinyl: c.vinyl_records.title, artist: c.vinyl_records.artist })}
                  </p>
                  <p className="line-clamp-2 text-sm text-white">{c.content}</p>
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
