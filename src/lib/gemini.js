import { supabase } from './supabase'

// Quand OpenRouter renvoie "quota épuisé", on arrête d'essayer de générer
// pendant un moment plutôt que de spammer des appels voués à échouer (et de
// laisser "Génération…" tourner dans le vide sur chaque vinyle retourné).
const QUOTA_BACKOFF_MS = 60 * 60 * 1000
const QUOTA_STORAGE_KEY = 'waxshelf_anecdote_quota_until'

function getQuotaUntil() {
  try {
    return Number(localStorage.getItem(QUOTA_STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}

function setQuotaUntil(timestamp) {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(timestamp))
  } catch {
    // localStorage indisponible (navigation privée, etc.) : tant pis, on
    // retentera à chaque fois plutôt que de planter.
  }
}

export function isQuotaExceeded() {
  return Date.now() < getQuotaUntil()
}

let queue = Promise.resolve()

export function generateAnecdote(artist, title, year) {
  if (isQuotaExceeded()) return Promise.resolve(null)
  queue = queue.then(() => delay(500))
  return (queue = queue.then(() => fetchAnecdote(artist, title, year)))
}

async function fetchAnecdote(artist, title, year) {
  console.log('[OpenRouter] Génération pour', artist, title)
  try {
    const { data, error } = await supabase.functions.invoke('generate-anecdote', {
      body: { artist, title, year },
    })
    if (error) {
      console.error('[OpenRouter] Erreur:', error.message)
      return null
    }
    if (data?.quotaExceeded) {
      setQuotaUntil(Date.now() + QUOTA_BACKOFF_MS)
    }
    return data?.anecdote || null
  } catch (err) {
    console.error('[OpenRouter] Erreur réseau:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
