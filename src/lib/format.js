// Formate une valeur monétaire dans la devise du compte Discogs de l'utilisateur
// (repliée sur l'euro pour les valeurs enregistrées avant l'introduction de la devise).
export function formatCurrency(value, currency = 'EUR') {
  if (value == null) return null
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

// Formate un timestamp en "il y a X jours" (ou "aujourd'hui" / "hier").
export function timeAgo(dateStr) {
  if (!dateStr) return null
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}
