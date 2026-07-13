import { presetFromAvatarUrl } from '../../lib/avatars'

/**
 * Affiche l'avatar d'un profil : preset emoji, image uploadée (avatar_url
 * classique), ou repli sur l'initiale du pseudo. `className` définit la
 * taille/forme du conteneur (ex. "h-8 w-8 rounded-full").
 */
export default function Avatar({ avatarUrl, fallbackLetter, className = '' }) {
  const preset = presetFromAvatarUrl(avatarUrl)

  if (preset) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden ${className}`}
        style={{ backgroundColor: preset.bg }}
      >
        <span>{preset.emoji}</span>
      </div>
    )
  }

  if (avatarUrl) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-[#1a1a1a] font-bold ${className}`}>
      {(fallbackLetter || '?').toUpperCase()}
    </div>
  )
}
