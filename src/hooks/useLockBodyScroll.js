import { useEffect } from 'react'

// Empêche le scroll de la page derrière une modale/bottom-sheet ouverte —
// sans ça, sur mobile, on peut faire défiler le contenu en arrière-plan
// pendant qu'on interagit avec la modale au premier plan.
export function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])
}
