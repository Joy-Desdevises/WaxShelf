import { useState } from 'react'

const MOODS = ['Détente', 'Énergie', 'Mélancolie', 'Fête', 'Concentration', 'Surprise moi']
const DURATIONS = ['< 30 min', '30-45 min', '45-60 min', 'Peu importe']
const GENRES_OPTIONS = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Soul', 'Classical', 'Pop', 'Folk', 'Reggae', 'Metal', 'Peu importe']

export default function ListenSuggestionModal({ collection, onClose }) {
  const [mood, setMood] = useState('')
  const [duration, setDuration] = useState('')
  const [genre, setGenre] = useState('')
  const [suggestion, setSuggestion] = useState(null)

  function getSuggestion() {
    let pool = [...collection]

    // Filtre genre
    if (genre && genre !== 'Peu importe') {
      const filtered = pool.filter(
        (v) =>
          v.genres?.some((g) => g.toLowerCase().includes(genre.toLowerCase())) ||
          v.styles?.some((s) => s.toLowerCase().includes(genre.toLowerCase()))
      )
      if (filtered.length > 0) pool = filtered
    }

    // Si "Surprise moi", on ignore les autres filtres
    if (!mood || mood === 'Surprise moi') {
      setSuggestion(pool[Math.floor(Math.random() * pool.length)])
      return
    }

    // Filtre humeur (mapping rough)
    const moodMap = {
      Détente: ['Jazz', 'Soul', 'Folk', 'Classical', 'Bossa Nova'],
      Énergie: ['Rock', 'Metal', 'Electronic', 'Punk', 'Drum n Bass'],
      Mélancolie: ['Folk', 'Blues', 'Alternative', 'Indie', 'Post-Rock'],
      Fête: ['Electronic', 'Disco', 'Hip-Hop', 'Pop', 'Funk'],
      Concentration: ['Classical', 'Ambient', 'Jazz', 'Electronic'],
    }
    const preferredStyles = moodMap[mood] || []
    const moodFiltered = pool.filter((v) =>
      preferredStyles.some(
        (s) =>
          v.genres?.some((g) => g.toLowerCase().includes(s.toLowerCase())) ||
          v.styles?.some((st) => st.toLowerCase().includes(s.toLowerCase()))
      )
    )
    if (moodFiltered.length > 0) pool = moodFiltered

    setSuggestion(pool[Math.floor(Math.random() * pool.length)])
  }

  const canSuggest = mood || duration || genre

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[#111] p-6 shadow-2xl sm:max-w-lg sm:rounded-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#555] hover:text-white"
        >
          ✕
        </button>

        {!suggestion ? (
          <>
            <h2 className="mb-1 text-xl font-semibold text-white">
              🎲 Que devrais-je écouter ?
            </h2>
            <p className="mb-6 text-sm text-[#888]">
              Réponds à quelques questions et je choisis pour toi dans ta collection.
            </p>

            {/* Humeur */}
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
              Humeur
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip key={m} label={m} active={mood === m} onClick={() => setMood(m === mood ? '' : m)} />
              ))}
            </div>

            {/* Durée */}
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
              Durée disponible
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip key={d} label={d} active={duration === d} onClick={() => setDuration(d === duration ? '' : d)} />
              ))}
            </div>

            {/* Genre */}
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
              Genre préféré
            </label>
            <div className="mb-6 flex flex-wrap gap-2">
              {GENRES_OPTIONS.map((g) => (
                <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(g === genre ? '' : g)} />
              ))}
            </div>

            <button
              onClick={getSuggestion}
              className="w-full rounded-lg bg-[#f5a623] py-3 font-medium text-black transition hover:bg-[#fbbf24] active:scale-95"
            >
              Trouve-moi un vinyle 🎵
            </button>
          </>
        ) : (
          <SuggestionResult vinyl={suggestion} onReset={() => setSuggestion(null)} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-[#f5a623] bg-[#f5a623]/15 text-[#f5a623]'
          : 'border-[#333] text-[#888] hover:border-[#555] hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function SuggestionResult({ vinyl, onReset, onClose }) {
  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

  return (
    <div className="text-center">
      <p className="mb-4 text-sm text-[#888]">Pour toi ce soir 🎵</p>
      <div className="mx-auto mb-4 h-48 w-48 overflow-hidden rounded-lg shadow-xl">
        <img
          src={vinyl.cover_image || vinyl.thumb_image || PLACEHOLDER}
          alt={vinyl.title}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="text-xl font-bold text-white">{vinyl.title}</p>
      <p className="mt-1 text-[#888]">{vinyl.artist}</p>
      <div className="mt-2 flex items-center justify-center gap-3 text-sm text-[#555]">
        {vinyl.year && <span>{vinyl.year}</span>}
        {vinyl.styles?.[0] && <span>· {vinyl.styles[0]}</span>}
        {vinyl.average_value && <span>· ~{vinyl.average_value}€</span>}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 rounded-lg border border-[#333] py-2.5 text-sm text-[#888] transition hover:border-[#555] hover:text-white"
        >
          Autre suggestion
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-[#f5a623] py-2.5 text-sm font-medium text-black transition hover:bg-[#fbbf24]"
        >
          C'est parti ! 🎶
        </button>
      </div>
    </div>
  )
}
