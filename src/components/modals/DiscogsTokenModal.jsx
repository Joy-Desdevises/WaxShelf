import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const STEPS = [
  {
    title: 'Créer un token Discogs',
    description: (
      <>
        <p className="text-sm text-[#888]">
          Connecte-toi à ton compte Discogs, puis va dans :{' '}
          <strong className="text-white">Paramètres → Développeurs → Générer un token personnel</strong>
        </p>
        <a
          href="https://www.discogs.com/settings/developers"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#f5a623]/40 px-4 py-2 text-sm text-[#f5a623] transition hover:bg-[#f5a623]/10"
        >
          Ouvrir Discogs →
        </a>
      </>
    ),
  },
  {
    title: 'Colle ton token Discogs',
    description: null,
  },
  {
    title: 'Ton nom d\'utilisateur Discogs',
    description: null,
  },
]

export default function DiscogsTokenModal({ onClose, onSuccess }) {
  const { updateProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [discogsUsername, setDiscogsUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleFinish() {
    const cleanToken = token.trim()
    const cleanUsername = discogsUsername.trim()
    if (!cleanToken || !cleanUsername) {
      setError('Token et nom d\'utilisateur requis.')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await updateProfile({
      discogs_token: cleanToken,
      discogs_username: cleanUsername,
    })
    setSaving(false)
    if (err) {
      setError('Erreur lors de la sauvegarde. Réessaie.')
    } else {
      // On passe les valeurs fraîches directement — pas de dépendance au profil React
      onSuccess?.({ token: cleanToken, discogsUsername: cleanUsername })
      onClose()
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="relative w-full max-w-md rounded-xl bg-[#111] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#555] hover:text-white"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                  i < step
                    ? 'bg-[#f5a623] text-black'
                    : i === step
                    ? 'border-2 border-[#f5a623] text-[#f5a623]'
                    : 'border border-[#333] text-[#555]'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 ${i < step ? 'bg-[#f5a623]' : 'bg-[#333]'}`} />
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-2 text-lg font-semibold text-white">{STEPS[step].title}</h2>

        <div className="mb-6">
          {/* Étape 0 — Instructions */}
          {step === 0 && STEPS[0].description}

          {/* Étape 1 — Token avec œil */}
          {step === 1 && (
            <div>
              <p className="mb-3 text-sm text-[#888]">Colle ton token Discogs ci-dessous :</p>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#555] outline-none focus:border-[#f5a623] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition"
                >
                  {showToken ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 — Username Discogs */}
          {step === 2 && (
            <div>
              <p className="mb-1 text-sm text-[#888]">
                Ton nom d&apos;utilisateur Discogs (celui affiché sur ton profil) :
              </p>
              <p className="mb-3 text-xs text-[#555]">
                Attention : c&apos;est sensible à la casse — copie-le exactement depuis{' '}
                <a
                  href="https://www.discogs.com/my"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f5a623] hover:underline"
                >
                  discogs.com/my
                </a>
              </p>
              <input
                type="text"
                placeholder="MonPseudoDiscogs"
                value={discogsUsername}
                onChange={(e) => setDiscogsUsername(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#f5a623] transition"
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm text-[#555] transition hover:text-white disabled:opacity-0"
          >
            ← Retour
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !token.trim()}
              className="rounded-lg bg-[#f5a623] px-5 py-2 text-sm font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-40"
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving || !token.trim() || !discogsUsername.trim()}
              className="rounded-lg bg-[#f5a623] px-5 py-2 text-sm font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-40"
            >
              {saving ? 'Sauvegarde…' : 'Terminer ✓'}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
