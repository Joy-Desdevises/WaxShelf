/**
 * VinylCard
 * Carte carrée avec effet flip 3D au survol.
 * Clic → ouvre la modale de détail.
 * Au premier survol, génère une anecdote via Gemini et la sauvegarde en DB.
 *
 * Props :
 *  - vinyl         : objet vinyl_record
 *  - size          : 'sm' | 'lg'
 *  - onClick       : fonction appelée au clic
 *  - currentUserId : id de l'utilisateur connecté (permet de logger une écoute)
 */

import { useState } from 'react'
import { generateAnecdote } from '../../lib/gemini'
import { formatCurrency } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useLogPlay } from '../../hooks/usePlayLog'

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function VinylCard({ vinyl, size = 'lg', onClick, currentUserId }) {
  const dim = 'w-full aspect-square'
  const titleSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const artistSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  const [anecdote, setAnecdote] = useState(vinyl.anecdote || null)
  const [loading, setLoading] = useState(false)
  // Le flip est piloté en JS (plutôt que par un simple `:hover` CSS) pour
  // fonctionner aussi bien au survol (desktop) qu'au tap (tactile, pas de hover fiable).
  const [flipped, setFlipped] = useState(false)

  const logPlay = useLogPlay(vinyl.id)
  const [justLogged, setJustLogged] = useState(false)

  async function handleLogPlay(e) {
    e.stopPropagation()
    if (!currentUserId || logPlay.isPending) return
    await logPlay.mutateAsync(currentUserId)
    setJustLogged(true)
    setTimeout(() => setJustLogged(false), 2000)
  }

  async function maybeLoadAnecdote() {
    if (size === 'sm' || anecdote || loading) return
    setLoading(true)
    try {
      // vinyl.year est l'année de CE pressage précis (souvent une réédition
      // tardive) ; original_year (sortie via master_id) donne l'année de
      // sortie originale de l'album, plus pertinente pour une anecdote historique.
      const text = await generateAnecdote(vinyl.artist, vinyl.title, vinyl.original_year || vinyl.year)
      if (text) {
        setAnecdote(text)
        supabase
          .from('vinyl_records')
          .update({ anecdote: text })
          .eq('id', vinyl.id)
          .then(({ error }) => {
            if (error) console.error('[Supabase] Erreur sauvegarde anecdote:', error.message)
            else console.log('[Supabase] Anecdote sauvegardée pour', vinyl.title)
          })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleMouseEnter() {
    setFlipped(true)
    maybeLoadAnecdote()
  }

  function handleMouseLeave() {
    setFlipped(false)
  }

  function handleToggleFlip(e) {
    e.stopPropagation()
    setFlipped((f) => {
      const next = !f
      if (next) maybeLoadAnecdote()
      return next
    })
  }

  return (
    <div
      className={`vinyl-card-container relative ${dim} cursor-pointer select-none ${flipped ? 'is-flipped' : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${vinyl.artist} — ${vinyl.title}`}
    >
      <div className="vinyl-card-inner">

        {/* ── RECTO : Pochette ── */}
        <div className="vinyl-card-front bg-[#1a1a1a]">
          <img
            src={vinyl.cover_image || vinyl.thumb_image || PLACEHOLDER}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
          />
          {vinyl.rating > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[#f5a623] backdrop-blur-sm">
              {'★'.repeat(vinyl.rating)}
            </span>
          )}
          {vinyl.average_value && (
            <span
              className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-[#f5a623] backdrop-blur-sm"
              title="Prix mini Discogs (annonce la moins chère en vente actuellement)"
            >
              ~{formatCurrency(vinyl.average_value, vinyl.average_value_currency)}
            </span>
          )}
        </div>

        {/* ── VERSO : Infos + Anecdote ── */}
        <div className="vinyl-card-back flex flex-col bg-[#111] p-3">
          {/* Style principal */}
          {vinyl.styles?.length > 0 && (
            <span className="self-start rounded bg-[#f5a623]/15 px-2 py-0.5 text-[10px] font-medium text-[#f5a623]">
              {vinyl.styles[0]}
            </span>
          )}

          {/* Anecdote (lg uniquement) */}
          {size === 'lg' && (
            <div className="flex flex-1 items-center justify-center py-2">
              {loading ? (
                <p className="animate-pulse text-center text-[9px] italic text-[#999]">
                  Génération…
                </p>
              ) : anecdote ? (
                <p className="line-clamp-5 text-center text-[9px] italic leading-relaxed text-[#aaa]">
                  {anecdote}
                </p>
              ) : null}
            </div>
          )}

          {/* Artiste + Titre */}
          <div className={size === 'lg' ? '' : 'mt-auto'}>
            <p className={`line-clamp-1 font-semibold text-white ${titleSize}`}>
              {vinyl.title}
            </p>
            <p className={`line-clamp-1 text-[#888] ${artistSize} mt-0.5`}>
              {vinyl.artist}
            </p>
          </div>

          {/* Année de sortie de l'album uniquement (rien si inconnue) + hint clic */}
          <div className="mt-2 flex items-center justify-between">
            {vinyl.original_year && (
              <span className="text-[10px] text-[#999]">{vinyl.original_year}</span>
            )}
            <span className="ml-auto text-[9px] text-[#888] italic">Clic pour détails</span>
          </div>
        </div>

      </div>

      {/* ── Bouton "j'écoute" : hors du volet qui flip, reste toujours cliquable ── */}
      {currentUserId && (
        <button
          onClick={handleLogPlay}
          disabled={logPlay.isPending}
          title="J'écoute ça"
          aria-label="J'écoute ça"
          className={`absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition disabled:opacity-60 ${
            justLogged
              ? 'bg-[#f5a623] text-black'
              : 'bg-black/70 text-[#f5a623] hover:bg-[#f5a623] hover:text-black'
          }`}
        >
          <span className="text-xs">{justLogged ? '✓' : '▶'}</span>
        </button>
      )}

      {/* ── Bouton flip explicite : le survol ne marche pas au tactile, donc on
          donne un moyen tap-friendly de voir le verso (anecdote/style) ── */}
      {size === 'lg' && (
        <button
          onClick={handleToggleFlip}
          title={flipped ? 'Voir la pochette' : "Voir l'anecdote"}
          aria-label={flipped ? 'Voir la pochette' : "Voir l'anecdote"}
          className="absolute bottom-1.5 left-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-[#f5a623] backdrop-blur-sm transition hover:bg-[#f5a623] hover:text-black"
        >
          <span className="text-xs">{flipped ? '🖼' : 'ℹ'}</span>
        </button>
      )}
    </div>
  )
}
