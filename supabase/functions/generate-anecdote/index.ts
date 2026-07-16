// Génère une anecdote courte sur un album via OpenRouter (modèle gratuit,
// suffixe :free). Auparavant appelé directement depuis le client avec une
// clé VITE_*, ce qui la compilait en clair dans le bundle JS public —
// n'importe qui pouvait l'extraire et l'utiliser à volonté. La clé vit
// maintenant uniquement comme secret de cette fonction (OPENROUTER_API_KEY),
// jamais exposée au client. Réservé aux utilisateurs connectés, pour éviter
// qu'un script anonyme épuise le quota gratuit (20 req/min, 50/jour).
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

async function fetchAnecdote(apiKey: string, model: string, prompt: string, attempt = 1): Promise<string | null> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://waxshelf.app',
      'X-Title': 'WaxShelf',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    }),
  })

  if (res.status === 429) {
    if (attempt >= 2) {
      console.error('[OpenRouter] Quota épuisé après 2 tentatives')
      return null
    }
    await delay(15000)
    return fetchAnecdote(apiKey, model, prompt, attempt + 1)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[OpenRouter] Erreur HTTP', res.status, JSON.stringify(body))
    return null
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
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

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'Clé OpenRouter manquante côté serveur.' }, 500)
    // Configurable sans redéploiement : si ce modèle disparaît du catalogue
    // gratuit d'OpenRouter, changer le secret OPENROUTER_MODEL suffit.
    const model = Deno.env.get('OPENROUTER_MODEL') ?? 'meta-llama/llama-3.3-70b-instruct:free'

    const yearPart = year ? ` (${year})` : ''
    const prompt = `En UNE phrase très courte (maximum 15 mots), donne une anecdote vraie et surprenante sur l'album "${title}" de ${artist}${yearPart}. Priorité absolue : une anecdote spécifique à CET album précis (enregistrement, sortie, réception critique, un titre qui y figure...) — utilise ta meilleure estimation si tu n'es pas sûr à 100%, plutôt que de jouer la sécurité. Cet album existe réellement et fait partie de la collection de l'utilisateur : ne remets jamais en question son existence, sa date de sortie ou son authenticité. Ne bascule sur une anecdote générale à propos de l'artiste ${artist} qu'en tout dernier recours, si tu ne reconnais vraiment aucun élément permettant de parler de cet album précis (sans jamais dire que tu ne le connais pas). Réponds uniquement avec cette phrase, sans introduction ni guillemets.`

    const anecdote = await fetchAnecdote(apiKey, model, prompt)
    return jsonResponse({ anecdote })
  } catch (err) {
    console.error('[OpenRouter] Erreur:', err instanceof Error ? err.message : String(err))
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
