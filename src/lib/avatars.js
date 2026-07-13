// Avatars prédéfinis sur le thème musical : pas d'upload de fichier,
// juste un emoji + une couleur, stockés dans profiles.avatar_url sous
// la forme "preset:<id>" pour rester distinguables d'une vraie URL d'image.
export const AVATAR_PRESETS = [
  { id: 'vinyl', emoji: '📀', bg: '#f5a623' },
  { id: 'guitar', emoji: '🎸', bg: '#e63946' },
  { id: 'sax', emoji: '🎷', bg: '#2a9d8f' },
  { id: 'drum', emoji: '🥁', bg: '#e76f51' },
  { id: 'headphones', emoji: '🎧', bg: '#457b9d' },
  { id: 'mic', emoji: '🎤', bg: '#9b5de5' },
  { id: 'trumpet', emoji: '🎺', bg: '#ca8a04' },
  { id: 'violin', emoji: '🎻', bg: '#6a4c93' },
  { id: 'piano', emoji: '🎹', bg: '#1d3557' },
  { id: 'note', emoji: '🎵', bg: '#d62828' },
  // Variantes vinyle, mêmes disques, autres couleurs de fond
  { id: 'vinyl-red', emoji: '📀', bg: '#c1121f' },
  { id: 'vinyl-blue', emoji: '📀', bg: '#1d4ed8' },
  { id: 'vinyl-green', emoji: '📀', bg: '#2b9348' },
  { id: 'vinyl-purple', emoji: '📀', bg: '#7c3aed' },
  { id: 'vinyl-pink', emoji: '📀', bg: '#db2777' },
  { id: 'vinyl-teal', emoji: '📀', bg: '#0d9488' },
  { id: 'vinyl-dark', emoji: '📀', bg: '#27272a' },
]

const PRESET_PREFIX = 'preset:'

export function presetFromAvatarUrl(avatarUrl) {
  if (!avatarUrl?.startsWith(PRESET_PREFIX)) return null
  const id = avatarUrl.slice(PRESET_PREFIX.length)
  return AVATAR_PRESETS.find((p) => p.id === id) || null
}

export function presetToAvatarUrl(presetId) {
  return `${PRESET_PREFIX}${presetId}`
}
