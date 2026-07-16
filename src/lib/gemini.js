import { supabase } from './supabase'

let queue = Promise.resolve()

export function generateAnecdote(artist, title, year) {
  queue = queue.then(() => delay(500))
  return (queue = queue.then(() => fetchAnecdote(artist, title, year)))
}

async function fetchAnecdote(artist, title, year) {
  console.log('[Groq] Génération pour', artist, title)
  try {
    const { data, error } = await supabase.functions.invoke('generate-anecdote', {
      body: { artist, title, year },
    })
    if (error) {
      console.error('[Groq] Erreur:', error.message)
      return null
    }
    return data?.anecdote || null
  } catch (err) {
    console.error('[Groq] Erreur réseau:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
