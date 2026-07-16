// Génère une anecdote courte sur un album via l'API Claude (Anthropic).
// Auparavant appelé directement depuis le client avec VITE_GROQ_API_KEY, ce
// qui compilait la clé (facturée à l'usage) en clair dans le bundle JS
// public — n'importe qui pouvait l'extraire et l'utiliser à volonté. La clé
// Anthropic vit maintenant uniquement comme secret de cette fonction
// (ANTHROPIC_API_KEY), jamais exposée au client. Réservé aux utilisateurs
// connectés, pour éviter qu'un script anonyme épuise le quota/la facture.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1'

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

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'Clé Anthropic manquante côté serveur.' }, 500)

    const yearPart = year ? ` (${year})` : ''
    const prompt = `En UNE phrase très courte (maximum 15 mots), donne une anecdote vraie et surprenante sur l'album "${title}" de ${artist}${yearPart}. Priorité absolue : une anecdote spécifique à CET album précis (enregistrement, sortie, réception critique, un titre qui y figure...) — utilise ta meilleure estimation si tu n'es pas sûr à 100%, plutôt que de jouer la sécurité. Cet album existe réellement et fait partie de la collection de l'utilisateur : ne remets jamais en question son existence, sa date de sortie ou son authenticité. Ne bascule sur une anecdote générale à propos de l'artiste ${artist} qu'en tout dernier recours, si tu ne reconnais vraiment aucun élément permettant de parler de cet album précis (sans jamais dire que tu ne le connais pas). Réponds uniquement avec cette phrase, sans introduction ni guillemets.`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      return jsonResponse({ anecdote: null })
    }

    const block = message.content.find((b) => b.type === 'text')
    const anecdote = block && block.type === 'text' ? block.text.trim() : null
    return jsonResponse({ anecdote })
  } catch (err) {
    console.error('[Claude] Erreur:', err instanceof Error ? err.message : String(err))
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
