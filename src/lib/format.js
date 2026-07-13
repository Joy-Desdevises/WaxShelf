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
