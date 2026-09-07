#!/usr/bin/env node
// Régénère dist/sitemap.xml avec la liste des profils publics.
// Exécuté après `vite build` (voir .github/workflows/deploy.yml) : le
// sitemap statique de public/sitemap.xml a déjà été copié dans dist/, ce
// script le remplace par une version à jour. Toute erreur (réseau, schéma,
// variables manquantes) est avalée pour ne jamais faire échouer le build —
// on garde alors le sitemap statique existant plutôt que de bloquer le déploiement.

import { writeFileSync } from 'node:fs'

const SITE_URL = 'https://waxshelf.fr'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

function urlEntry(loc, { changefreq, priority }) {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY absents : sitemap statique conservé.')
    return
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=username&is_public=eq.true`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase a répondu ${res.status}`)
  const profiles = await res.json()

  const entries = [
    urlEntry(`${SITE_URL}/`, { changefreq: 'daily', priority: '1.0' }),
    ...profiles
      .filter((p) => p.username)
      .map((p) => urlEntry(`${SITE_URL}/${escapeXml(p.username)}`, { changefreq: 'weekly', priority: '0.7' })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
  writeFileSync('dist/sitemap.xml', xml)
  console.log(`[sitemap] dist/sitemap.xml régénéré avec ${profiles.length} profil(s) public(s).`)
}

main().catch((err) => {
  console.warn('[sitemap] Échec de la génération dynamique, sitemap statique conservé :', err.message)
})
