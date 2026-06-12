const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let queue = Promise.resolve()

export function generateAnecdote(artist, title, year) {
  if (!API_KEY) {
    console.warn('[Gemini] Clé API manquante — vérifie .env.local')
    return Promise.resolve(null)
  }

  queue = queue.then(() => delay(2000))
  return (queue = queue.then(() => fetchAnecdote(artist, title, year)))
}

async function fetchAnecdote(artist, title, year, attempt = 1) {
  console.log('[Gemini] Génération pour', artist, title, '(tentative', attempt, ')')
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
      const body = await res.json().catch(() => ({}))
      console.warn('[Gemini] 429 body:', JSON.stringify(body))
      if (attempt >= 2) {
        console.error('[Gemini] Quota épuisé après 2 tentatives')
        return null
      }
      await delay(15000)
      return fetchAnecdote(artist, title, year, attempt + 1)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[Gemini] Erreur HTTP', res.status, JSON.stringify(body))
      return null
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch (err) {
    console.error('[Gemini] Erreur réseau:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
