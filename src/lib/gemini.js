const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// File d'attente pour éviter le rate limiting (max ~15 req/min en tier gratuit)
let queue = Promise.resolve()

export function generateAnecdote(artist, title, year) {
  if (!API_KEY) {
    console.warn('[Gemini] Clé API manquante — vérifie .env.local')
    return Promise.resolve(null)
  }

  // Chaque appel attend le précédent + 2s de délai
  queue = queue.then(async () => {
    await delay(2000)
    return null
  })

  return (queue = queue.then(() => fetchAnecdote(artist, title, year)))
}

async function fetchAnecdote(artist, title, year) {
  console.log('[Gemini] Génération pour', artist, title)
  const yearPart = year ? ` (${year})` : ''
  const prompt = `Génère une courte anecdote fascinante (2-3 phrases max) sur l'album "${title}" de ${artist}${yearPart}. L'anecdote doit être vraie, surprenante et donner envie d'écouter l'album. Réponds directement avec l'anecdote, sans introduction ni guillemets.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.8 },
        }),
      }
    )

    if (res.status === 429) {
      console.warn('[Gemini] Rate limit, retry dans 5s...')
      await delay(5000)
      return fetchAnecdote(artist, title, year)
    }

    if (!res.ok) {
      console.error('[Gemini] Erreur HTTP', res.status)
      return null
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch (err) {
    console.error('[Gemini] Erreur:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
