import axios from 'axios'

const BASE_URL = 'https://api.discogs.com'

// Crée une instance Axios configurée avec le token utilisateur
export function createDiscogsClient(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': 'WaxShelf/1.0 +https://waxshelf.app',
    },
  })
}

// ── Collection ──────────────────────────────────────────────────────────────

/**
 * Récupère la collection Discogs d'un utilisateur (toutes les pages)
 * @param {string} token - Token personnel Discogs
 * @param {string} discogsUsername
 * @returns {Promise<Array>} - Tous les vinyles de la collection
 */
export async function fetchFullCollection(token, discogsUsername) {
  const client = createDiscogsClient(token)
  const allReleases = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const { data } = await client.get(`/users/${discogsUsername}/collection/folders/0/releases`, {
      params: { page, per_page: 100, sort: 'added', sort_order: 'desc' },
    })
    totalPages = data.pagination.pages
    allReleases.push(...data.releases)
    page++
  }

  return allReleases.map(normalizeRelease)
}

/**
 * Normalise un objet release Discogs vers le format WaxShelf
 */
function normalizeRelease(release) {
  const info = release.basic_information
  return {
    discogs_id: info.id,
    title: info.title,
    artist: info.artists?.map((a) => a.name).join(', ') || 'Artiste inconnu',
    year: info.year || null,
    genres: info.genres || [],
    styles: info.styles || [],
    // Pas de `country` ici : cet endpoint ne le fournit jamais (absent de
    // basic_information et des objets `labels`). Il est complété séparément
    // via enrichCollectionMetadata, sans quoi une valeur déjà connue serait
    // écrasée par null à chaque resynchronisation.
    cover_image: info.cover_image || null,
    thumb_image: info.thumb || null,
    average_value: null, // sera mis à jour séparément
  }
}

// ── Recherche ────────────────────────────────────────────────────────────────

/**
 * Recherche dans le catalogue Discogs
 * @param {string} token
 * @param {string} query
 * @param {object} filters - { genre, year, country, type }
 */
export async function searchDiscogs(token, query, filters = {}) {
  const client = createDiscogsClient(token)
  const params = {
    q: query,
    type: filters.type || 'release',
    per_page: 25,
    page: 1,
    ...filters,
  }

  const { data } = await client.get('/database/search', { params })
  return data.results.map((r) => ({
    discogs_id: r.id,
    title: r.title,
    artist: r.title.split(' - ')[0] || '',
    year: r.year ? parseInt(r.year) : null,
    genres: r.genre || [],
    styles: r.style || [],
    country: r.country || null,
    cover_image: r.cover_image || null,
    thumb_image: r.thumb || null,
  }))
}

// ── Wantlist ─────────────────────────────────────────────────────────────────

/**
 * Récupère la wantlist Discogs
 */
export async function fetchWantlist(token, discogsUsername) {
  const client = createDiscogsClient(token)
  const allWants = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const { data } = await client.get(`/users/${discogsUsername}/wants`, {
      params: { page, per_page: 100 },
    })
    totalPages = data.pagination.pages
    allWants.push(...data.wants)
    page++
  }

  return allWants.map((w) => {
    const info = w.basic_information
    return {
      discogs_id: info.id,
      title: info.title,
      artist: info.artists?.map((a) => a.name).join(', ') || '',
      year: info.year || null,
      cover_image: info.cover_image || null,
      thumb_image: info.thumb || null,
    }
  })
}

// ── Valeur marché ─────────────────────────────────────────────────────────────

// L'API publique Discogs n'expose ni médiane ni prix haut pour un release
// (seulement lowest_price + num_for_sale via /marketplace/stats — ces deux
// champs sont la totalité des données de marché documentées par Discogs).
// /marketplace/price_suggestions renvoie en revanche le prix suggéré par
// Discogs pour chaque état (grade), dans la devise du compte. On prend VG+
// (Very Good Plus), l'état le plus couramment échangé, comme proxy réaliste
// d'une "valeur typique" — bien plus représentatif que le prix de l'annonce
// la moins chère du moment, sans toutefois être identique à la médiane
// affichée sur la fiche release du site discogs.com (donnée non exposée par l'API).
const CONDITION_PRIORITY = [
  'Very Good Plus (VG+)',
  'Near Mint (NM or M-)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Mint (M)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)',
]

function pickSuggestedPrice(suggestions) {
  if (!suggestions) return null
  for (const grade of CONDITION_PRIORITY) {
    if (suggestions[grade]) return suggestions[grade]
  }
  return Object.values(suggestions)[0] || null
}

/**
 * Récupère la valeur de marché suggérée (VG+) d'un release
 */
export async function fetchReleaseValue(token, releaseId) {
  const client = createDiscogsClient(token)
  try {
    const { data } = await client.get(`/marketplace/price_suggestions/${releaseId}`)
    return pickSuggestedPrice(data)
  } catch {
    return null
  }
}

/**
 * Rafraîchit les valeurs de marché de toute une collection
 * Respecte le rate limit Discogs (~60 req/min) avec un délai entre les requêtes
 *
 * @param {string} token
 * @param {Array} records - tableau de { id, discogs_id }
 * @param {function} onProgress - callback(done, total, currentValue)
 * @returns {Promise<Array>} - tableau de { id, average_value, average_value_currency }
 */
export async function refreshCollectionValues(token, records, onProgress) {
  const client = createDiscogsClient(token)
  const withDiscogs = records.filter((r) => r.discogs_id)
  const results = []

  for (let i = 0; i < withDiscogs.length; i++) {
    const record = withDiscogs[i]
    try {
      const { data } = await client.get(`/marketplace/price_suggestions/${record.discogs_id}`)
      const suggestion = pickSuggestedPrice(data)
      results.push({
        id: record.id,
        average_value: suggestion?.value ?? null,
        average_value_currency: suggestion?.currency ?? null,
      })
      onProgress?.(i + 1, withDiscogs.length, suggestion?.value ?? null)
    } catch {
      results.push({ id: record.id, average_value: null, average_value_currency: null })
      onProgress?.(i + 1, withDiscogs.length, null)
    }
    // Pause pour respecter le rate limit (max ~55 req/min pour rester safe)
    if (i < withDiscogs.length - 1) {
      await new Promise((r) => setTimeout(r, 1100))
    }
  }

  return results
}

/**
 * Complète le pays et l'année manquants en interrogeant le détail de chaque
 * release (/releases/{id}), seul endpoint Discogs fournissant le pays de façon
 * fiable (absent des endpoints collection et de la sync en masse).
 * Respecte le rate limit Discogs (~60 req/min).
 *
 * @param {string} token
 * @param {Array} records - tableau de { id, discogs_id, year }
 * @param {function} onProgress - callback(done, total)
 * @returns {Promise<Array>} - tableau de { id, country, year }
 */
export async function enrichCollectionMetadata(token, records, onProgress) {
  const client = createDiscogsClient(token)
  const withDiscogs = records.filter((r) => r.discogs_id)
  const results = []

  for (let i = 0; i < withDiscogs.length; i++) {
    const record = withDiscogs[i]
    try {
      const { data } = await client.get(`/releases/${record.discogs_id}`)
      results.push({
        id: record.id,
        country: data.country || null,
        year: data.year || record.year || null,
      })
    } catch {
      results.push({ id: record.id, country: null, year: record.year || null })
    }
    onProgress?.(i + 1, withDiscogs.length)
    if (i < withDiscogs.length - 1) {
      await new Promise((r) => setTimeout(r, 1100))
    }
  }

  return results
}
