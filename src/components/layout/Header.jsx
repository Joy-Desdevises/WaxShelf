import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import ListenSuggestionModal from '../modals/ListenSuggestionModal'
import AuthModal from '../modals/AuthModal'

export default function Header({ collection = [] }) {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [showSuggest, setShowSuggest] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🎵</span>
            <span className="text-lg font-semibold tracking-tight">WaxShelf</span>
          </Link>

          {/* Nav utilisateur (pages d'un profil) */}
          {username && (
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to={`/${username}`}>Collection</NavLink>
              <NavLink to={`/${username}/dashboard`}>Stats</NavLink>
              <NavLink to={`/${username}/wantlist`}>Wantlist</NavLink>
            </nav>
          )}

          {/* Actions droite */}
          <div className="flex items-center gap-2">

            {/* "What should I listen to?" */}
            {username && collection.length > 0 && (
              <button
                onClick={() => setShowSuggest(true)}
                className="flex items-center gap-2 rounded-full bg-[#f5a623] px-4 py-1.5 text-sm font-medium text-black transition-all hover:bg-[#fbbf24] hover:scale-105 active:scale-95"
              >
                <span>🎲</span>
                <span className="hidden sm:inline">What should I listen to?</span>
              </button>
            )}

            {/* Auth */}
            {user ? (
              <div className="relative" ref={menuRef}>
                {/* Avatar — ouvre le menu */}
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#333] bg-[#1a1a1a] text-sm font-bold text-white transition hover:border-[#555]"
                >
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    : (profile?.username?.[0] ?? '?').toUpperCase()
                  }
                </button>

                {/* Menu déroulant */}
                {showMenu && (
                  <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-[#222] bg-[#111] py-1 shadow-2xl">
                    {profile && (
                      <>
                        <p className="px-4 py-2 text-xs text-[#555]">@{profile.username}</p>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to={`/${profile.username}`} onClick={() => setShowMenu(false)}>
                          Ma collection
                        </MenuItem>
                        <MenuItem to={`/${profile.username}/dashboard`} onClick={() => setShowMenu(false)}>
                          Statistiques
                        </MenuItem>
                        <MenuItem to={`/${profile.username}/wantlist`} onClick={() => setShowMenu(false)}>
                          Wantlist
                        </MenuItem>
                        <div className="my-1 border-t border-[#1a1a1a]" />
                        <MenuItem to="/settings" onClick={() => setShowMenu(false)}>
                          ⚙️ Paramètres
                        </MenuItem>
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
                className="rounded-lg border border-[#333] px-4 py-1.5 text-sm text-white transition hover:border-[#555] hover:bg-[#1a1a1a]"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {showSuggest && (
        <ListenSuggestionModal
          collection={collection}
          onClose={() => setShowSuggest(false)}
        />
      )}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </>
  )
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
    >
      {children}
    </Link>
  )
}

function MenuItem({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
    >
      {children}
    </Link>
  )
}
