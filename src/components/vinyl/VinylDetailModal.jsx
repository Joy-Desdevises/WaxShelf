import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLikes, useComments, useVinylMeta } from '../../hooks/useSocial'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function VinylDetailModal({ vinyl, isOwner, onClose }) {
  const { user, profile } = useAuth()
  const { likes, toggleLike } = useLikes(vinyl.id)
  const { comments, addComment, deleteComment } = useComments(vinyl.id)
  const { saveMeta } = useVinylMeta(vinyl.id)

  const [rating, setRating] = useState(vinyl.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [notes, setNotes] = useState(vinyl.notes || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasLiked = likes.some((l) => l.user_id === user?.id)

  // Fermer avec Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleRating(value) {
    const newRating = value === rating ? null : value
    setRating(newRating || 0)
    await saveMeta.mutateAsync({ rating: newRating })
  }

  async function handleSaveNotes() {
    await saveMeta.mutateAsync({ notes })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function handleLike() {
    if (!user) return
    toggleLike.mutate({ userId: user.id, hasLiked })
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim() || !user) return
    setSubmitting(true)
    await addComment.mutateAsync({ userId: user.id, content: comment.trim() })
    setComment('')
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#111] shadow-2xl sm:max-w-2xl sm:rounded-xl">
        {/* Handle mobile */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-[#333] sm:hidden" />

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-[#888] hover:text-white"
        >
          ✕
        </button>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto">
          {/* ── Header : cover + infos principales ── */}
          <div className="flex gap-4 p-5 sm:gap-6 sm:p-6">
            <img
              src={vinyl.cover_image || vinyl.thumb_image || PLACEHOLDER}
              alt={vinyl.title}
              className="h-28 w-28 shrink-0 rounded-lg object-cover shadow-lg sm:h-40 sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">
                {vinyl.title}
              </p>
              <p className="mt-1 text-sm text-[#888]">{vinyl.artist}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {vinyl.year && <Tag>{vinyl.year}</Tag>}
                {vinyl.country && <Tag>{vinyl.country}</Tag>}
                {vinyl.genres?.slice(0, 2).map((g) => <Tag key={g}>{g}</Tag>)}
                {vinyl.styles?.slice(0, 2).map((s) => <Tag key={s} amber>{s}</Tag>)}
              </div>

              {vinyl.average_value && (
                <p className="mt-3 text-sm font-medium text-[#f5a623]">
                  ~{vinyl.average_value}€ valeur estimée
                </p>
              )}

              {/* ── Étoiles (owner = modifiable, sinon lecture seule) ── */}
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => isOwner && handleRating(star)}
                    onMouseEnter={() => isOwner && setHoverRating(star)}
                    onMouseLeave={() => isOwner && setHoverRating(0)}
                    className={`text-xl transition-transform ${isOwner ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${
                      star <= (hoverRating || rating) ? 'text-[#f5a623]' : 'text-[#333]'
                    }`}
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-1 text-xs text-[#555]">{rating}/5</span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a1a1a]" />

          {/* ── Notes privées (owner uniquement) ── */}
          {isOwner && (
            <div className="p-5 sm:p-6">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#555]">
                Notes personnelles <span className="normal-case">(privées)</span>
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Où tu l'as trouvé, ce qu'il t'évoque…"
                rows={3}
                className="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
              />
              <button
                onClick={handleSaveNotes}
                disabled={saveMeta.isPending}
                className="mt-2 rounded-lg bg-[#1a1a1a] px-4 py-1.5 text-xs text-[#888] transition hover:bg-[#2a2a2a] hover:text-white disabled:opacity-50"
              >
                {notesSaved ? '✓ Sauvegardé' : saveMeta.isPending ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          )}

          <div className="border-t border-[#1a1a1a]" />

          {/* ── Likes ── */}
          <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
            <button
              onClick={handleLike}
              disabled={!user || toggleLike.isPending}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
                hasLiked
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-[#2a2a2a] text-[#555] hover:border-red-500/30 hover:text-red-400'
              } disabled:cursor-default disabled:opacity-60`}
            >
              <span className="text-base">{hasLiked ? '❤️' : '🤍'}</span>
              <span>{likes.length} j'aime{likes.length > 1 ? 's' : ''}</span>
            </button>
            {!user && (
              <p className="text-xs text-[#555]">Connecte-toi pour liker</p>
            )}
          </div>

          <div className="border-t border-[#1a1a1a]" />

          {/* ── Commentaires ── */}
          <div className="p-5 sm:p-6">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#555]">
              Commentaires
              {comments.length > 0 && (
                <span className="ml-2 normal-case text-[#888]">· {comments.length}</span>
              )}
            </h3>

            {comments.length === 0 && (
              <p className="mb-4 text-sm text-[#444]">Aucun commentaire pour l'instant.</p>
            )}

            <div className="mb-4 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-bold text-[#f5a623]">
                    {(c.profiles?.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg bg-[#0a0a0a] px-3 py-2">
                    <div className="mb-1 flex items-center gap-2">
                      <Link
                        to={`/${c.profiles?.username}`}
                        onClick={onClose}
                        className="text-xs font-medium text-[#f5a623] hover:underline"
                      >
                        @{c.profiles?.username}
                      </Link>
                      <span className="text-[10px] text-[#444]">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {user?.id === c.user_id && (
                        <button
                          onClick={() => deleteComment.mutate(c.id)}
                          className="ml-auto text-[10px] text-[#444] hover:text-red-400"
                        >
                          supprimer
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-[#aaa]">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {user ? (
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Laisser un commentaire…"
                  maxLength={500}
                  className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || submitting}
                  className="rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-medium text-black hover:bg-[#fbbf24] disabled:opacity-40"
                >
                  {submitting ? '…' : 'Envoyer'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#444]">
                <button onClick={onClose} className="text-[#f5a623] hover:underline">
                  Connecte-toi
                </button>{' '}
                pour commenter.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Tag({ children, amber }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${
      amber
        ? 'bg-[#f5a623]/15 text-[#f5a623]'
        : 'bg-[#1a1a1a] text-[#888]'
    }`}>
      {children}
    </span>
  )
}
