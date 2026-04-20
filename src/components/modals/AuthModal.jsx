import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'signin') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.message)
      else onClose()
    } else {
      const { error: err } = await signUp(email, password, username)
      if (err) setError(err.message)
      else setSuccess('Compte créé ! Vérifie ton email pour confirmer ton inscription.')
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full rounded-t-2xl bg-[#111] p-6 shadow-2xl sm:max-w-sm sm:rounded-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <button onClick={onClose} className="absolute right-4 top-4 text-[#555] hover:text-white">✕</button>

        <h2 className="mb-6 text-xl font-semibold text-white">
          {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
        </h2>

        {success ? (
          <div className="rounded-lg bg-green-900/30 p-4 text-sm text-green-400">{success}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Field
                label="Nom d'utilisateur"
                type="text"
                value={username}
                onChange={setUsername}
                placeholder="votre-pseudo"
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <PasswordField
              label="Mot de passe"
              value={password}
              onChange={setPassword}
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#f5a623] py-2.5 font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-50"
            >
              {loading ? 'Chargement…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-[#555]">
          {mode === 'signin' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[#f5a623] hover:underline"
          >
            {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
      />
    </div>
  )
}

function PasswordField({ label, value, onChange, required }) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required={required}
          className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}
