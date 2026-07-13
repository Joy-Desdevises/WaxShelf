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
    // Pas de `country`, `average_value` (ni sa devise), `master_id` ou
    // `original_year` ici : cet endpoint ne fournit aucune de ces données
    // (absentes de basic_information). Elles sont complétées séparément via
    // enrichCollectionMetadata — les omettre du payload d'upsert est
    // essentiel, sans quoi chaque resynchronisation écraserait par null des
    // valeurs déjà connues.
    cover_image: info.cover_image || null,
    thumb_image: info.thumb || null,
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
  } catch (err) {
    console.error('[Discogs] Échec récupération devise du compte, repli sur USD:', err.response?.status, err.response?.data || err.message)
    return 'USD'
  }
}

// lowest_price peut être un nombre brut (observé en public/non-authentifié)
// ou un objet { value, currency } (observé sur d'autres endpoints Discogs) —
// on gère les deux formes plutôt que de supposer laquelle un compte donné
// recevra.
function extractLowestPrice(lowestPrice, fallbackCurrency) {
  if (typeof lowestPrice === 'number') {
    return { value: lowestPrice, currency: fallbackCurrency }
  }
  if (lowestPrice && typeof lowestPrice.value === 'number') {
    return { value: lowestPrice.value, currency: lowestPrice.currency || fallbackCurrency }
  }
  return { value: null, currency: null }
}

/**
 * Complète pays, année, valeur marché, master_id et original_year manquants
 * en interrogeant le détail de chaque release (+ son master s'il existe).
 * Respecte le rate limit Discogs (~60 req/min). Un échec sur un disque
 * (réseau, rate limit...) laisse ses données existantes intactes plutôt que
 * de les écraser par null.
 *
 * master_id référence l'œuvre Discogs (indépendante du pressage) ; son année
 * (/masters/{master_id}, endpoint public, requête séparée du quota
 * authentifié) est l'année de sortie originale de l'album — original_year —
 * utile partout où year (celle de ce pressage précis, potentiellement une
 * réédition tardive) prêterait à confusion.
 *
 * @param {string} token
 * @param {Array} records - tableau de { id, discogs_id, year }
 * @param {function} onProgress - callback(done, total)
 * @returns {Promise<Array>} - tableau de { id, country, year, average_value, average_value_currency, master_id, original_year }
 */
export async function enrichCollectionMetadata(token, records, onProgress) {
  const client = createDiscogsClient(token)
  const currency = await fetchAccountCurrency(client)
  const withDiscogs = records.filter((r) => r.discogs_id)
  const results = []
  let consecutiveFailures = 0

  for (let i = 0; i < withDiscogs.length; i++) {
    const record = withDiscogs[i]
    try {
      const { data } = await client.get(`/releases/${record.discogs_id}`, { params: { curr_abbr: currency } })
      const price = extractLowestPrice(data.lowest_price, currency)
      const masterId = data.master_id || null
      const originalYear = await fetchMasterYear(masterId)
      results.push({
        id: record.id,
        country: data.country || null,
        year: data.year || record.year || null,
        average_value: price.value,
        average_value_currency: price.currency,
        master_id: masterId,
        original_year: originalYear,
      })
      consecutiveFailures = 0
    } catch (err) {
      // échec réseau/rate-limit : on laisse les données existantes intactes
      console.error('[Discogs] Échec enrichissement release', record.discogs_id, ':', err.response?.status, err.response?.data || err.message)
      consecutiveFailures++
      // Une rafale d'échecs consécutifs signale un blocage global (rate limit,
      // anti-bot Cloudflare) plutôt que des soucis isolés par disque : mieux
      // vaut s'arrêter que griller le reste du quota pour rien.
      if (consecutiveFailures >= 5) {
        console.error('[Discogs] 5 échecs consécutifs, arrêt anticipé (rate limit probable) — réessaie dans quelques minutes.')
        break
      }
    }
    onProgress?.(i + 1, withDiscogs.length)
    if (i < withDiscogs.length - 1) {
      // Chaque itération fait 2 requêtes vers 2 quotas séparés : /releases (avec
      // token, 60 req/min) et /masters pour l'année d'album (anonyme, ~25
      // req/min seulement). C'est ce deuxième quota, bien plus strict, qui
      // dimensionne le délai — sinon la plupart des appels /masters se font
      // rate-limiter en silence et original_year reste vide pour presque tout
      // le monde. 2600ms ~ 23 req/min, marge confortable sous 25/min.
      await new Promise((r) => setTimeout(r, 2600))
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
  } catch (err) {
    console.error('[Discogs] Échec récupération master', masterId, ':', err.response?.status, err.response?.data || err.message)
    return null
  }
}
