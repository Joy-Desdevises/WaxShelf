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

// ── Enrichissement (pays, année, valeur) ────────────────────────────────────

// /releases/{id} est le seul endpoint qui fournit le pays de façon fiable
// (absent des endpoints collection et de la sync en masse), et il inclut aussi
// lowest_price/num_for_sale : la seule donnée de marché accessible à TOUS les
// comptes Discogs sans configuration préalable. (/marketplace/price_suggestions
// donnerait un prix par état plus proche d'une "valeur typique", mais exige que
// le compte ait rempli ses Seller Settings — non applicable à la plupart des
// utilisateurs, donc pas utilisé ici.) Un seul appel par disque suffit donc
// pour compléter pays, année et valeur.
//
// average_value représente le prix de l'annonce la moins chère actuellement en
// vente sur Discogs — pas une moyenne ni une médiane (non exposées par l'API
// publique sans compte vendeur configuré). Sur /releases/{id}, lowest_price est
// un simple nombre (pas un objet { value, currency } comme sur /marketplace/stats)
// et ne précise pas sa devise : on la récupère une seule fois via le profil
// Discogs du token (curr_abbr) et on la fixe explicitement sur chaque requête.

async function fetchAccountCurrency(client) {
  try {
    const { data: identity } = await client.get('/oauth/identity')
    const { data: user } = await client.get(`/users/${identity.username}`)
    return user.curr_abbr || 'USD'
  } catch {
    return 'USD'
  }
}

/**
 * Complète pays, année, valeur marché et master_id manquants en interrogeant
 * le détail de chaque release. Respecte le rate limit Discogs (~60 req/min).
 * Un échec sur un disque (réseau, rate limit...) laisse ses données
 * existantes intactes plutôt que de les écraser par null.
 *
 * master_id référence l'œuvre Discogs (indépendante du pressage) : son année
 * (/masters/{master_id}) est l'année de sortie originale de l'album, utile
 * partout où year (celle de ce pressage précis, potentiellement une
 * réédition tardive) prêterait à confusion — voir fetchMasterYear.
 *
 * @param {string} token
 * @param {Array} records - tableau de { id, discogs_id, year }
 * @param {function} onProgress - callback(done, total)
 * @returns {Promise<Array>} - tableau de { id, country, year, average_value, average_value_currency, master_id }
 */
export async function enrichCollectionMetadata(token, records, onProgress) {
  const client = createDiscogsClient(token)
  const currency = await fetchAccountCurrency(client)
  const withDiscogs = records.filter((r) => r.discogs_id)
  const results = []

  for (let i = 0; i < withDiscogs.length; i++) {
    const record = withDiscogs[i]
    try {
      const { data } = await client.get(`/releases/${record.discogs_id}`, { params: { curr_abbr: currency } })
      results.push({
        id: record.id,
        country: data.country || null,
        year: data.year || record.year || null,
        average_value: typeof data.lowest_price === 'number' ? data.lowest_price : null,
        average_value_currency: currency,
        master_id: data.master_id || null,
      })
    } catch {
      // échec réseau/rate-limit : on laisse les données existantes intactes
    }
    onProgress?.(i + 1, withDiscogs.length)
    if (i < withDiscogs.length - 1) {
      await new Promise((r) => setTimeout(r, 1100))
    }
  }

  return results
}

/**
 * Récupère l'année de sortie originale de l'album via son master Discogs.
 * Endpoint public, ne nécessite pas de token.
 */
export async function fetchMasterYear(masterId) {
  if (!masterId) return null
  try {
    const { data } = await axios.get(`${BASE_URL}/masters/${masterId}`, {
      headers: { 'User-Agent': 'WaxShelf/1.0 +https://waxshelf.app' },
    })
    return data.year || null
  } catch {
    return null
  }
}
