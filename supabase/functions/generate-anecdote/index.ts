// Génère une anecdote courte sur un album via l'API Gemini (Google AI
// Studio, gratuite). Auparavant appelé directement depuis le client avec
// VITE_GROQ_API_KEY / VITE_GEMINI_API_KEY, ce qui compilait la clé en clair
// dans le bundle JS public — n'importe qui pouvait l'extraire et l'utiliser
// à volonté. La clé vit maintenant uniquement comme secret de cette fonction
// (GEMINI_API_KEY), jamais exposée au client. Réservé aux utilisateurs
// connectés, pour éviter qu'un script anonyme épuise le quota gratuit.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchAnecdote(apiKey: string, prompt: string, attempt = 1): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
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
    if (attempt >= 2) {
      console.error('[Gemini] Quota épuisé après 2 tentatives')
      return null
    }
    await delay(15000)
    return fetchAnecdote(apiKey, prompt, attempt + 1)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[Gemini] Erreur HTTP', res.status, JSON.stringify(body))
    return null
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return typeof text === 'string' ? text.trim() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non authentifié.' }, 401)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Session invalide.' }, 401)

    const { artist, title, year } = await req.json()
    if (!artist || !title || typeof artist !== 'string' || typeof title !== 'string') {
      return jsonResponse({ error: 'artist et title requis.' }, 400)
    }
    if (artist.length > 200 || title.length > 200) {
      return jsonResponse({ error: 'artist/title trop longs.' }, 400)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'Clé Gemini manquante côté serveur.' }, 500)

    const yearPart = year ? ` (${year})` : ''
    const prompt = `En UNE phrase très courte (maximum 15 mots), donne une anecdote vraie et surprenante sur l'album "${title}" de ${artist}${yearPart}. Priorité absolue : une anecdote spécifique à CET album précis (enregistrement, sortie, réception critique, un titre qui y figure...) — utilise ta meilleure estimation si tu n'es pas sûr à 100%, plutôt que de jouer la sécurité. Cet album existe réellement et fait partie de la collection de l'utilisateur : ne remets jamais en question son existence, sa date de sortie ou son authenticité. Ne bascule sur une anecdote générale à propos de l'artiste ${artist} qu'en tout dernier recours, si tu ne reconnais vraiment aucun élément permettant de parler de cet album précis (sans jamais dire que tu ne le connais pas). Réponds uniquement avec cette phrase, sans introduction ni guillemets.`

    const anecdote = await fetchAnecdote(apiKey, prompt)
    return jsonResponse({ anecdote })
  } catch (err) {
    console.error('[Gemini] Erreur:', err instanceof Error ? err.message : String(err))
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
