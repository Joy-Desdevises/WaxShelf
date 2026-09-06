import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCollection } from '../../hooks/useCollection'
import { useDiscogsSync } from '../../hooks/useDiscogsSync'
import { useSearchProfiles } from '../../hooks/useProfile'
import { useUnreadNotificationsCount } from '../../hooks/useNotifications'
import ListenSuggestionModal from '../modals/ListenSuggestionModal'
import AuthModal from '../modals/AuthModal'
import UpdatePasswordModal from '../modals/UpdatePasswordModal'
import Avatar from './Avatar'
import LanguageToggle from './LanguageToggle'
import waxshelfLogoText from '../../assets/waxshelf_logo_texte.svg'

// Header unique, affiché sur toutes les pages : mêmes onglets, même widget
// "What should I listen to?" et même bouton de sync Discogs partout, basés
// sur l'utilisateur connecté plutôt que sur la page actuellement affichée —
// synchroniser sa collection ne devrait pas nécessiter d'être sur une page en particulier.
export default function Header() {
  const { t } = useTranslation()
  const { username } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut, passwordRecovery } = useAuth()
  const { data: ownCollection = [] } = useCollection(user?.id)
  const { syncStep, enrichProgress } = useDiscogsSync()
  const { data: unreadCount = 0 } = useUnreadNotificationsCount(user?.id, profile?.last_notifications_seen_at)

  const [showSuggest, setShowSuggest] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const userMenuRef = useRef(null)

  // Ferme le menu au changement de page — ajusté pendant le rendu plutôt que
  // dans un effet (cf. https://react.dev/learn/you-might-not-need-an-effect),
  // pour éviter un rendu de trop après le changement de route.
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname)
    setShowUserMenu(false)
  }

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
  // Stats/Journal restent bloqués sur ce profil visité tant qu'on navigue
  // via ces onglets. Repli sur :username seulement si déconnecté. Plus de
  // lien Wantlist séparé : fusionné dans Collection sous forme d'onglet.
  const navUsername = profile?.username || username

  const navLinks = [
    { to: '/', label: t('header.nav.home') },
    ...(navUsername
      ? [
          { to: `/${navUsername}`, label: t('header.nav.collection') },
          { to: `/${navUsername}/dashboard`, label: t('header.nav.dashboard'), badge: unreadCount },
          { to: `/${navUsername}/journal`, label: t('header.nav.journal') },
        ]
      : []),
  ]

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
              <NavLink key={l.to} to={l.to} badge={l.badge}>{l.label}</NavLink>
            ))}
          </nav>

          {/* Actions droite — plus d'écart entre les 3 cercles sur mobile pour
              des zones de clic bien distinctes, resserré sur desktop */}
          <div className="flex items-center gap-4 md:gap-2">

            {/* Recherche de profil par pseudo — visible de tous, y compris
                déconnecté : un compte privé se trouve toujours par son
                pseudo exact, seul son contenu reste caché (cf. migration
                20260906140000_open_profile_visibility). */}
            <HeaderSearch />

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
                sur mobile (pseudo affiché sous l'icône, à toutes les tailles),
                plus besoin de burger séparé. Sur desktop, le nav du haut donne
                déjà accès aux pages : le menu ne garde que réglages/langue/
                déconnexion ; sur mobile (pas de nav visible), il garde aussi
                les liens de pages. */}
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
                  <span className="max-w-[4.5rem] truncate text-[9px] leading-none text-[#999]">{profile?.username}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[#222] bg-[#111] py-1 shadow-2xl">
                    {profile && (
                      <>
                        <p className="px-4 py-2 text-xs text-[#999]">@{profile.username}</p>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <div className="md:hidden">
                          <MenuItem to={`/${profile.username}`} onClick={() => setShowUserMenu(false)}>{t('header.menu.collection')}</MenuItem>
                          <MenuItem to={`/${profile.username}/dashboard`} onClick={() => setShowUserMenu(false)} badge={unreadCount}>{t('header.menu.stats')}</MenuItem>
                          <MenuItem to={`/${profile.username}/journal`} onClick={() => setShowUserMenu(false)}>{t('header.menu.journal')}</MenuItem>
                          <div className="my-1 border-t border-[#1a1a1a]" />
                        </div>
                        <MenuItem to="/settings" onClick={() => setShowUserMenu(false)}>{t('header.menu.settings')}</MenuItem>
                        <LanguageMenuItem />
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
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  className="rounded-lg border border-[#333] px-3 py-1.5 text-sm text-white transition hover:border-[#555] hover:bg-[#1a1a1a]"
                >
                  {t('header.login')}
                </button>
                {/* Pas de menu avatar tant que déconnecté : le drapeau reste
                    ici, seul endroit du header où le changer sinon. */}
                <LanguageToggle />
              </>
            )}
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

function NotificationBadge({ count }) {
  if (!count) return null
  return (
    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#f5a623] px-1 text-[10px] font-bold leading-none text-black">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function NavLink({ to, children, badge }) {
  return (
    <Link to={to} className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white">
      {children}
      <NotificationBadge count={badge} />
    </Link>
  )
}

function MenuItem({ to, onClick, children, badge }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center justify-between px-4 py-2 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white">
      {children}
      <NotificationBadge count={badge} />
    </Link>
  )
}

function LanguageMenuItem() {
  const { t, i18n } = useTranslation()

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
    >
      <span>{t('header.language')}</span>
      <span>{i18n.language === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
    </button>
  )
}

function HeaderSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data: results = [] } = useSearchProfiles(query)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function goTo(username) {
    navigate(`/${username}`)
    setQuery('')
    setOpen(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (results[0]) goTo(results[0].username)
  }

  return (
    <div className="relative" ref={ref}>
      <form onSubmit={handleSubmit} className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#999]">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={t('header.search.placeholder')}
          aria-label={t('header.search.placeholder')}
          className="w-32 rounded-lg border border-[#333] bg-[#111] py-1.5 pl-8 pr-2 text-sm text-white placeholder-[#888] outline-none transition-colors focus:border-[#555] sm:w-40"
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 top-10 z-50 max-h-72 w-56 overflow-y-auto rounded-xl border border-[#222] bg-[#111] py-1 shadow-2xl sm:w-64">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#999]">{t('header.search.empty')}</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => goTo(r.username)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#1a1a1a]"
              >
                <Avatar avatarUrl={r.avatar_url} fallbackLetter={r.username?.[0]} className="h-8 w-8 shrink-0 rounded-full text-sm text-white" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-white">{r.display_name || r.username}</p>
                  <p className="line-clamp-1 text-xs text-[#999]">@{r.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
