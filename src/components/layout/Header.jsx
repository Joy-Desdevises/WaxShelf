import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCollection } from '../../hooks/useCollection'
import { useDiscogsSync } from '../../hooks/useDiscogsSync'
import { timeAgo } from '../../lib/format'
import ListenSuggestionModal from '../modals/ListenSuggestionModal'
import AuthModal from '../modals/AuthModal'
import UpdatePasswordModal from '../modals/UpdatePasswordModal'
import Avatar from './Avatar'
import waxshelfLogoText from '../../assets/waxshelf_logo_texte.svg'

// Header unique, affiché sur toutes les pages : mêmes onglets, même widget
// "What should I listen to?" et même bouton de sync Discogs partout, basés
// sur l'utilisateur connecté plutôt que sur la page actuellement affichée —
// synchroniser sa collection ne devrait pas nécessiter d'être sur une page en particulier.
export default function Header() {
  const { t, i18n } = useTranslation()
  const { username } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut, passwordRecovery } = useAuth()
  const { data: ownCollection = [] } = useCollection(user?.id)
  const { handleSync, syncStep, enrichProgress } = useDiscogsSync()

  const [showSuggest, setShowSuggest] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const userMenuRef = useRef(null)

  // Ferme le menu au changement de page
  useEffect(() => {
    setShowUserMenu(false)
  }, [location.pathname])

  // Ferme le menu utilisateur si clic extérieur
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  // Toujours basé sur le profil connecté, jamais sur celui affiché à l'écran
  // (ex: on visite le profil de quelqu'un) — sinon les onglets Collection/
  // Stats/Wantlist/Journal restent bloqués sur ce profil visité tant qu'on
  // navigue via ces onglets. Repli sur :username seulement si déconnecté.
  const navUsername = profile?.username || username

  const navLinks = [
    { to: '/', label: t('header.nav.home') },
    ...(navUsername
      ? [
          { to: `/${navUsername}`, label: t('header.nav.collection') },
          { to: `/${navUsername}/dashboard`, label: t('header.nav.dashboard') },
          { to: `/${navUsername}/wantlist`, label: t('header.nav.wantlist') },
          { to: `/${navUsername}/journal`, label: t('header.nav.journal') },
        ]
      : []),
  ]

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <>
      <header className="safe-top sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

          {/* Logo */}
          <Link to="/" className="flex items-center text-white" aria-label={t('header.ariaHome')}>
            <img
              src={waxshelfLogoText}
              alt="WaxShelf"
              className="h-10 w-auto object-contain md:h-14"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
            ))}
          </nav>

          {/* Actions droite — plus d'écart entre les 3 cercles sur mobile pour
              des zones de clic bien distinctes, resserré sur desktop */}
          <div className="flex items-center gap-4 md:gap-2">

            {/* Sync Discogs (collection + wantlist) — sur mobile, icône dans un
                cercle + légende dessous (même gabarit que l'avatar) ; sur
                desktop, pilule icône+texte comme avant */}
            {user && (
              <button
                onClick={() => handleSync()}
                disabled={syncStep !== null}
                title={profile?.last_collection_sync_at ? t('header.sync.lastSync', { date: timeAgo(profile.last_collection_sync_at) }) : undefined}
                className="flex flex-col items-center gap-0.5 disabled:opacity-50 md:flex-row md:gap-2 md:rounded-lg md:border md:border-[#333] md:bg-[#111] md:px-4 md:py-1.5 md:text-white md:transition md:hover:border-[#f5a623]/60 md:hover:bg-[#1a1a1a]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#333] bg-[#111] transition hover:border-[#f5a623]/60 hover:bg-[#1a1a1a] md:h-auto md:w-auto md:rounded-none md:border-0 md:bg-transparent md:hover:border-0 md:hover:bg-transparent">
                  <span className={syncStep !== null ? 'animate-spin inline-block' : ''}>🔄</span>
                </span>
                <span className="text-[9px] leading-none text-[#999] md:hidden">
                  {syncStep === 'collection' ? t('header.sync.syncing') : syncStep === 'wantlist' ? t('header.sync.wantlist') : t('header.sync.sync')}
                </span>
                <span className="hidden md:inline md:text-sm">
                  {syncStep === 'collection'
                    ? enrichProgress
                      ? t('header.sync.syncingProgress', { done: enrichProgress.done, total: enrichProgress.total })
                      : t('header.sync.syncing')
                    : syncStep === 'wantlist'
                      ? t('header.sync.wantlist')
                      : t('header.sync.sync')}
                </span>
              </button>
            )}

            {/* "What should I listen to?" — même principe : cercle ambré +
                légende dessous sur mobile, pilule ambrée pleine sur desktop */}
            {user && ownCollection.length > 0 && (
              <button
                onClick={() => setShowSuggest(true)}
                className="flex flex-col items-center gap-0.5 md:flex-row md:gap-2 md:rounded-full md:bg-[#f5a623] md:px-4 md:py-1.5 md:font-medium md:text-black md:transition-all md:hover:bg-[#fbbf24] md:active:scale-95"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5a623] transition-all hover:bg-[#fbbf24] active:scale-95 md:h-auto md:w-auto md:rounded-none md:bg-transparent md:hover:bg-transparent md:active:scale-100">
                  🎲
                </span>
                <span className="text-[9px] leading-none text-[#999] md:hidden">{t('header.listen.label')}</span>
                <span className="hidden md:inline md:text-sm">{t('header.listen.cta')}</span>
              </button>
            )}

            {/* Avatar + menu utilisateur — fait aussi office de menu de navigation
                sur mobile (légende "Menu" sous l'icône), plus besoin de burger séparé */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="rounded-full border border-[#333] transition hover:border-[#555]">
                    <Avatar
                      avatarUrl={profile?.avatar_url}
                      fallbackLetter={profile?.username?.[0]}
                      className="h-8 w-8 rounded-full text-sm text-white"
                    />
                  </span>
                  <span className="text-[9px] leading-none text-[#999] md:hidden">{t('header.menu.label')}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[#222] bg-[#111] py-1 shadow-2xl">
                    {profile && (
                      <>
                        <p className="px-4 py-2 text-xs text-[#999]">@{profile.username}</p>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to={`/${profile.username}`} onClick={() => setShowUserMenu(false)}>{t('header.menu.collection')}</MenuItem>
                        <MenuItem to={`/${profile.username}/dashboard`} onClick={() => setShowUserMenu(false)}>{t('header.menu.stats')}</MenuItem>
                        <MenuItem to={`/${profile.username}/wantlist`} onClick={() => setShowUserMenu(false)}>{t('header.menu.wantlist')}</MenuItem>
                        <MenuItem to={`/${profile.username}/journal`} onClick={() => setShowUserMenu(false)}>{t('header.menu.journal')}</MenuItem>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to="/settings" onClick={() => setShowUserMenu(false)}>{t('header.menu.settings')}</MenuItem>
                      </>
                    )}
                    <div className="my-1 border-t border-[#1a1a1a]" />
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 transition hover:bg-[#1a1a1a]"
                    >
                      {t('header.menu.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-lg border border-[#333] px-3 py-1.5 text-sm text-white transition hover:border-[#555] hover:bg-[#1a1a1a]"
              >
                {t('header.login')}
              </button>
            )}

            {/* Sélecteur de langue : drapeau de la langue actuellement affichée */}
            <button
              onClick={toggleLanguage}
              title={t('header.language')}
              aria-label={t('header.language')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#333] text-base transition hover:border-[#555]"
            >
              {i18n.language === 'fr' ? '🇫🇷' : '🇬🇧'}
            </button>
          </div>
        </div>

        {/* Progression du sync — barre pleine largeur */}
        {syncStep === 'collection' && enrichProgress && (
          <div className="h-0.5 w-full overflow-hidden bg-[#1a1a1a]">
            <div
              className="h-full bg-[#f5a623] transition-all"
              style={{ width: `${(enrichProgress.done / enrichProgress.total) * 100}%` }}
            />
          </div>
        )}
      </header>

      {showSuggest && (
        <ListenSuggestionModal collection={ownCollection} onClose={() => setShowSuggest(false)} />
      )}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
      {passwordRecovery && <UpdatePasswordModal />}
    </>
  )
}

function NavLink({ to, children }) {
  return (
    <Link to={to} className="rounded-md px-3 py-1.5 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white">
      {children}
    </Link>
  )
}

function MenuItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} className="block px-4 py-2 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white">
      {children}
    </Link>
  )
}
