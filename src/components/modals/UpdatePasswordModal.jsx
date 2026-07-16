import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

// Affichée quand Supabase détecte un lien de réinitialisation de mot de
// passe dans l'URL (événement PASSWORD_RECOVERY) — pas de bouton pour la
// fermer volontairement, il faut définir un nouveau mot de passe pour
// terminer le flux.
export default function UpdatePasswordModal() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setError('')
    setLoading(true)
    const { error: err } = await updatePassword(password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative w-full rounded-t-2xl bg-[#111] p-6 shadow-2xl sm:max-w-sm sm:rounded-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#333] sm:hidden" />
        <h2 className="mb-2 text-xl font-semibold text-white">Nouveau mot de passe</h2>
        <p className="mb-6 text-sm text-[#999]">Choisis un nouveau mot de passe pour ton compte.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              required
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-white transition"
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {visible ? '🙈' : '👁️'}
            </button>
          </div>
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirme le mot de passe"
            required
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#f5a623] py-2.5 font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
