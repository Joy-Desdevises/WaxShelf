import VinylCard from './VinylCard'

/**
 * VinylGrid
 *
 * Props :
 *  - records       : tableau de vinyl_record
 *  - size          : 'sm' | 'lg'
 *  - loading       : boolean
 *  - onCardClick   : (vinyl) => void — ouvre la modale détail
 *  - currentUserId : id de l'utilisateur connecté (permet de logger une écoute depuis la carte)
 */
export default function VinylGrid({ records = [], size = 'lg', loading = false, onCardClick, currentUserId }) {
  if (loading) {
    return (
      <div className={`grid gap-3 ${gridCols(size)}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="mb-4 text-5xl">🎶</span>
        <p className="text-lg font-medium text-[#888]">Aucun vinyle trouvé</p>
        <p className="mt-1 text-sm text-[#999]">Essaie d&apos;ajuster les filtres ou synchro ta collection Discogs.</p>
      </div>
    )
  }

  return (
    <div className={`grid gap-3 ${gridCols(size)}`}>
      {records.map((vinyl) => (
        <VinylCard
          key={vinyl.id}
          vinyl={vinyl}
          size={size}
          onClick={() => onCardClick?.(vinyl)}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

// En dessous de `sm` (mobile), un nombre de colonnes fixe pour que les
// cartes remplissent toute la largeur (au lieu d'un track auto-fill qui les
// laisse alignées à gauche avec de l'espace mort à droite). À partir de
// `sm`, on repasse en auto-fill classique.
function gridCols(size) {
  if (size === 'sm') return 'grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]'
  return 'grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
}

function SkeletonCard() {
  return <div className="aspect-square w-full animate-pulse rounded-lg bg-[#1a1a1a]" />
}
