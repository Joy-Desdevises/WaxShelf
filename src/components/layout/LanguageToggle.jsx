import { useTranslation } from 'react-i18next'

// Bouton drapeau FR/EN réutilisable — utilisé dans le Header, mais aussi
// dans les modales plein écran (AuthModal...) qui masquent le Header et
// couperaient sinon tout accès au changement de langue une fois ouvertes.
export default function LanguageToggle({ className = '' }) {
  const { t, i18n } = useTranslation()

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <button
      onClick={toggleLanguage}
      title={t('header.language')}
      aria-label={t('header.language')}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#333] text-base transition hover:border-[#555] ${className}`}
    >
      {i18n.language === 'fr' ? '🇫🇷' : '🇬🇧'}
    </button>
  )
}
