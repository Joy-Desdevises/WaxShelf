/**
 * VinylCard
 * Carte carrée avec effet flip 3D au survol.
 * Clic → ouvre la modale de détail.
 *
 * Props :
 *  - vinyl   : objet vinyl_record
 *  - size    : 'sm' | 'lg'
 *  - onClick : fonction appelée au clic
 */

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E"

export default function VinylCard({ vinyl, size = 'lg', onClick }) {
  const dim = size === 'sm' ? 'w-32 h-32' : 'w-52 h-52'
  const titleSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const artistSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div
      className={`vinyl-card-container ${dim} cursor-pointer select-none`}
      onClick={onClick}
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
          {/* Étoiles */}
          {vinyl.rating > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[#f5a623] backdrop-blur-sm">
              {'★'.repeat(vinyl.rating)}
            </span>
          )}
          {/* Badge valeur */}
          {vinyl.average_value && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-[#f5a623] backdrop-blur-sm">
              ~{vinyl.average_value}€
            </span>
          )}
        </div>

        {/* ── VERSO : Infos ── */}
        <div className="vinyl-card-back flex flex-col justify-between bg-[#111] p-3">
          {/* Style principal */}
          {vinyl.styles?.length > 0 && (
            <span className="self-start rounded bg-[#f5a623]/15 px-2 py-0.5 text-[10px] font-medium text-[#f5a623]">
              {vinyl.styles[0]}
            </span>
          )}

          {/* Artiste + Titre */}
          <div className="mt-auto">
            <p className={`line-clamp-1 font-semibold text-white ${titleSize}`}>
              {vinyl.title}
            </p>
            <p className={`line-clamp-1 text-[#888] ${artistSize} mt-0.5`}>
              {vinyl.artist}
            </p>
          </div>

          {/* Année + Valeur + hint clic */}
          <div className="mt-2 flex items-center justify-between">
            {vinyl.year && (
              <span className="text-[10px] text-[#555]">{vinyl.year}</span>
            )}
            <span className="text-[9px] text-[#444] italic">Clic pour détails</span>
          </div>
        </div>

      </div>
    </div>
  )
}
