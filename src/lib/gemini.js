const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function generateAnecdote(artist, title, year) {
  if (!API_KEY) return null

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
    if (!res.ok) return null
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch {
    return null
  }
}
