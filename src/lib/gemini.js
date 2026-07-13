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
  const prompt = `En UNE phrase très courte (maximum 15 mots), donne une anecdote vraie et surprenante sur l'album "${title}" de ${artist}${yearPart}. Cet album existe réellement et fait partie de la collection de l'utilisateur : ne remets jamais en question son existence, sa date de sortie ou son authenticité. Si tu ne reconnais pas précisément cet album ou cette édition, donne à la place une anecdote vraie sur l'artiste ${artist} en général (sans mentionner que tu ne connais pas l'album). Réponds uniquement avec cette phrase, sans introduction ni guillemets.`

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
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('[Groq] Erreur réseau:', err)
    return null
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
