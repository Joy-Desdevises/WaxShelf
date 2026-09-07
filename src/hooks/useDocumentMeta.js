import { useEffect } from 'react'

const SITE_URL = 'https://waxshelf.fr'

function upsertMetaTag(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonicalTag(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSON_LD_ID = 'route-json-ld'

function upsertJsonLd(data) {
  let el = document.getElementById(JSON_LD_ID)
  if (!data) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.id = JSON_LD_ID
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

// Met à jour <title>, meta description, robots, canonical et JSON-LD à
// chaque changement de route. Sans effet sur les crawlers sociaux (qui ne
// lisent que le HTML brut servi par index.html, jamais le DOM post-JS) mais
// lu par Google (qui exécute le JS, y compris pour le JSON-LD) et affiché
// dans l'onglet du navigateur.
export default function useDocumentMeta({ title, description, noindex = false, jsonLd = null }) {
  useEffect(() => {
    if (title) document.title = title
    if (description) upsertMetaTag('description', description)
    upsertMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertCanonicalTag(`${SITE_URL}${window.location.pathname}`)
    upsertJsonLd(jsonLd)
    return () => upsertJsonLd(null)
  }, [title, description, noindex, jsonLd])
}
