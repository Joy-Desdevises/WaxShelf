import VinylCard from './VinylCard'

/**
 * VinylGrid
 * Grille de cartes vinyles avec toggle de taille.
 *
 * Props :
 *  - records : tableau de vinyl_record
 *  - size    : 'sm' | 'lg'
 *  - loading : boolean
 */
export default function VinylGrid({ records = [], size = 'lg', loading = false }) {
  if (loading) {
    return (
      <div className={`grid gap-3 ${gridCols(size)}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} size={size} />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-[#555]">
        <span className="mb-4 text-5xl">🎶</span>
        <p className="text-lg font-medium text-[#888]">Aucun vinyle trouvé</p>
        <p className="mt-1 text-sm">Essaie d&apos;ajuster les filtres ou synchro ta collection Discogs.</p>
      </div>
    )
  }

  return (
    <div className={`grid gap-3 ${gridCols(size)}`}>
      {records.map((vinyl) => (
        <VinylCard key={vinyl.id} vinyl={vinyl} size={size} />
      ))}
    </div>
  )
}

function gridCols(size) {
  if (size === 'sm') {
    return 'grid-cols-[repeat(auto-fill,minmax(128px,1fr))]'
  }
  return 'grid-cols-[repeat(auto-fill,minmax(208px,1fr))]'
}

function SkeletonCard({ size }) {
  const dim = size === 'sm' ? 'w-32 h-32' : 'w-full aspect-square'
  return (
    <div className={`${dim} animate-pulse rounded-lg bg-[#1a1a1a]`} />
  )
}
