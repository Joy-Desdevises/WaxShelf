const API_KEY = import.meta.env.VITE_GROQ_API_KEY

let queue = Promise.resolve()

export function generateAnecdote(artist, title, year) {
  if (!API_KEY) {
    console.warn('[Groq] Clé API manquante — vérifie .env.local')
    return Promise.resolve(null)
  }
  queue = queue.then(() => delay(500))
  return (queue = queue.then(() => fetchAnecdote(artist, title, year)))
}

async function fetchAnecdote(artist, title, year) {
  console.log('[Groq] Génération pour', artist, title)
  const yearPart = year ? ` (${year})` : ''
  const prompt = `En UNE seule phrase (jamais plus), donne une anecdote vraie et surprenante sur l'album "${title}" de ${artist}${yearPart}. Réponds uniquement avec cette phrase, sans introduction ni guillemets.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.8,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[Groq] Erreur HTTP', res.status, JSON.stringify(body))
      return null
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || null
    if (!text) return null
    // Garde uniquement la première phrase
    return text.split(/(?<=[.!?])\s+/)[0]
  } catch (err) {
    console.error('[Groq] Erreur réseau:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
