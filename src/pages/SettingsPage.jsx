import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Header from '../components/layout/Header'

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-bold text-white">Paramètres</h1>

        <div className="space-y-6">
          <ProfileSection profile={profile} updateProfile={updateProfile} />
          <DiscogsSection profile={profile} updateProfile={updateProfile} />
          <PasswordSection />
          <DangerSection signOut={signOut} navigate={navigate} />
        </div>
      </main>
    </div>
  )
}

// ── Section Profil ─────────────────────────────────────────────────────────

function ProfileSection({ profile, updateProfile }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    const { error } = await updateProfile({ display_name: displayName, username, bio, is_public: isPublic })
    setSaving(false)
    if (error) setStatus({ type: 'error', msg: error.message })
    else setStatus({ type: 'success', msg: 'Profil mis à jour ✓' })
  }

  return (
    <Card title="Profil">
      <div className="space-y-4">
        <Field label="Nom d'affichage" value={displayName} onChange={setDisplayName} placeholder="Ton nom public" />
        <Field
          label="Nom d'utilisateur"
          value={username}
          onChange={setUsername}
          placeholder="ton-pseudo"
          hint="Modifie l'URL de ta collection. Sensible à la casse."
        />
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quelques mots sur ta collection…"
            rows={3}
            className="w-full resize-none rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <div
            onClick={() => setIsPublic((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? 'bg-[#f5a623]' : 'bg-[#333]'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-sm text-[#888]">
            Collection publique — {isPublic ? 'visible par tous' : 'visible uniquement par toi'}
          </span>
        </label>
      </div>
      <StatusRow status={status} />
      <SaveBtn onClick={handleSave} saving={saving} />
    </Card>
  )
}

// ── Section Discogs ────────────────────────────────────────────────────────

function DiscogsSection({ profile, updateProfile }) {
  const [token, setToken] = useState(profile?.discogs_token || '')
  const [discogsUsername, setDiscogsUsername] = useState(profile?.discogs_username || '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave() {
    if (!token.trim() || !discogsUsername.trim()) {
      setStatus({ type: 'error', msg: 'Token et nom d\'utilisateur Discogs requis.' })
      return
    }
    setSaving(true)
    setStatus(null)
    const { error } = await updateProfile({
      discogs_token: token.trim(),
      discogs_username: discogsUsername.trim(),
    })
    setSaving(false)
    if (error) setStatus({ type: 'error', msg: error.message })
    else setStatus({ type: 'success', msg: 'Connexion Discogs mise à jour ✓' })
  }

  return (
    <Card title="Connexion Discogs">
      <p className="mb-4 text-sm text-[#555]">
        Génère un token sur{' '}
        <a
          href="https://www.discogs.com/settings/developers"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#f5a623] hover:underline"
        >
          discogs.com/settings/developers
        </a>
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">
            Token personnel
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Colle ton token ici"
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
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
        <Field
          label="Nom d'utilisateur Discogs"
          value={discogsUsername}
          onChange={setDiscogsUsername}
          placeholder="MonPseudoDiscogs"
          hint="Sensible à la casse — copie-le exactement depuis discogs.com/my"
        />
      </div>
      <StatusRow status={status} />
      <SaveBtn onClick={handleSave} saving={saving} />
    </Card>
  )
}

// ── Section Mot de passe ───────────────────────────────────────────────────

function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave() {
    if (!next || next.length < 6) {
      setStatus({ type: 'error', msg: 'Le nouveau mot de passe doit faire au moins 6 caractères.' })
      return
    }
    if (next !== confirm) {
      setStatus({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setSaving(true)
    setStatus(null)
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) setStatus({ type: 'error', msg: error.message })
    else {
      setStatus({ type: 'success', msg: 'Mot de passe mis à jour ✓' })
      setCurrent(''); setNext(''); setConfirm('')
    }
  }

  return (
    <Card title="Mot de passe">
      <div className="space-y-4">
        <PasswordField label="Nouveau mot de passe" value={next} onChange={setNext} placeholder="••••••••" />
        <PasswordField label="Confirmer le mot de passe" value={confirm} onChange={setConfirm} placeholder="••••••••" />
      </div>
      <StatusRow status={status} />
      <SaveBtn onClick={handleSave} saving={saving} label="Changer le mot de passe" />
    </Card>
  )
}

// ── Section Danger ─────────────────────────────────────────────────────────

function DangerSection({ signOut, navigate }) {
  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <Card title="Session">
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-red-500/30 px-5 py-2.5 text-sm text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
      >
        Se déconnecter
      </button>
    </Card>
  )
}

// ── Composants utilitaires ─────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
      <h2 className="mb-5 text-base font-semibold text-white">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
      />
      {hint && <p className="mt-1 text-xs text-[#555]">{hint}</p>}
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#555]">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#444] outline-none focus:border-[#f5a623] transition"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition"
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

function StatusRow({ status }) {
  if (!status) return null
  return (
    <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${
      status.type === 'success'
        ? 'bg-green-900/30 text-green-400'
        : 'bg-red-900/30 text-red-400'
    }`}>
      {status.msg}
    </p>
  )
}

function SaveBtn({ onClick, saving, label = 'Enregistrer' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-5 rounded-lg bg-[#f5a623] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-50"
    >
      {saving ? 'Sauvegarde…' : label}
    </button>
  )
}
