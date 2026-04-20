import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import ListenSuggestionModal from '../modals/ListenSuggestionModal'
import AuthModal from '../modals/AuthModal'

export default function Header({ collection = [] }) {
  const { username } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()

  const [showSuggest, setShowSuggest] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const userMenuRef = useRef(null)

  // Ferme les menus au changement de page
  useEffect(() => {
    setShowMobileMenu(false)
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

  const navLinks = username
    ? [
        { to: `/${username}`, label: 'Collection' },
        { to: `/${username}/dashboard`, label: 'Stats' },
        { to: `/${username}/wantlist`, label: 'Wantlist' },
      ]
    : []

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-xl">🎵</span>
            <span className="text-base font-semibold tracking-tight">WaxShelf</span>
          </Link>

          {/* Nav desktop */}
          {username && (
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
              ))}
            </nav>
          )}

          {/* Actions droite */}
          <div className="flex items-center gap-2">

            {/* "What should I listen to?" — icône seule sur mobile */}
            {username && collection.length > 0 && (
              <button
                onClick={() => setShowSuggest(true)}
                className="flex items-center gap-2 rounded-full bg-[#f5a623] px-3 py-1.5 text-sm font-medium text-black transition-all hover:bg-[#fbbf24] active:scale-95 md:px-4"
              >
                <span>🎲</span>
                <span className="hidden md:inline">What should I listen to?</span>
              </button>
            )}

            {/* Avatar + menu utilisateur */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#333] bg-[#1a1a1a] text-sm font-bold text-white transition hover:border-[#555]"
                >
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    : (profile?.username?.[0] ?? '?').toUpperCase()
                  }
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[#222] bg-[#111] py-1 shadow-2xl">
                    {profile && (
                      <>
                        <p className="px-4 py-2 text-xs text-[#555]">@{profile.username}</p>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to={`/${profile.username}`} onClick={() => setShowUserMenu(false)}>Ma collection</MenuItem>
                        <MenuItem to={`/${profile.username}/dashboard`} onClick={() => setShowUserMenu(false)}>Statistiques</MenuItem>
                        <MenuItem to={`/${profile.username}/wantlist`} onClick={() => setShowUserMenu(false)}>Wantlist</MenuItem>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to="/settings" onClick={() => setShowUserMenu(false)}>⚙️ Paramètres</MenuItem>
                      </>
                    )}
                    <div className="my-1 border-t border-[#1a1a1a]" />
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 transition hover:bg-[#1a1a1a]"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-lg border border-[#333] px-3 py-1.5 text-sm text-white transition hover:border-[#555] hover:bg-[#1a1a1a]"
              >
                Connexion
              </button>
            )}

            {/* Hamburger — mobile uniquement, si on est sur une page profil */}
            {username && (
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 rounded-lg border border-[#333] md:hidden"
                aria-label="Menu"
              >
                <span className={`block h-0.5 w-4 bg-white transition-all ${showMobileMenu ? 'translate-y-2 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-4 bg-white transition-all ${showMobileMenu ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-4 bg-white transition-all ${showMobileMenu ? '-translate-y-2 -rotate-45' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {showMobileMenu && username && (
          <div className="border-t border-[#222] bg-[#0a0a0a] px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-lg px-3 py-2.5 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {showSuggest && (
        <ListenSuggestionModal collection={collection} onClose={() => setShowSuggest(false)} />
      )}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
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
