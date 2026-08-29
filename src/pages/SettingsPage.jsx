import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Header from '../components/layout/Header'
import Avatar from '../components/layout/Avatar'
import { AVATAR_PRESETS, presetToAvatarUrl } from '../lib/avatars'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, profile, loading, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!loading && !user) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-bold text-white">{t('settingsPage.title')}</h1>

        {loading || !profile ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[#111]" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* key força un remount propre si l'utilisateur change (rare, mais sûr) :
                sans ça, les champs internes resteraient figés sur l'ancien profil. */}
            <ProfileSection key={profile.id} profile={profile} updateProfile={updateProfile} />
            <DiscogsSection key={profile.id} profile={profile} updateProfile={updateProfile} />
            <PasswordSection />
            <DangerSection signOut={signOut} navigate={navigate} profile={profile} />
          </div>
        )}
      </main>
    </div>
  )
}

// ── Section Profil ─────────────────────────────────────────────────────────

function ProfileSection({ profile, updateProfile }) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    const { error } = await updateProfile({ display_name: displayName, username, bio, is_public: isPublic })
    setSaving(false)
    if (error) setStatus({ type: 'error', msg: error.message })
    else setStatus({ type: 'success', msg: t('settingsPage.profile.updated') })
  }

  async function handleSelectAvatar(avatarUrl) {
    setAvatarError(null)
    setAvatarSaving(true)
    await updateProfile({ avatar_url: avatarUrl })
    setAvatarSaving(false)
  }

  async function handleUploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t('settingsPage.profile.imageTooLarge'))
      e.target.value = ''
      return
    }

    setAvatarError(null)
    setAvatarSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust : même chemin réutilisé à chaque upload (upsert), sans ça
      // le navigateur pourrait continuer d'afficher l'ancienne photo en cache.
      const { error: saveError } = await updateProfile({ avatar_url: `${data.publicUrl}?t=${Date.now()}` })
      if (saveError) throw saveError
    } catch (err) {
      setAvatarError(err.message)
    }
    setAvatarSaving(false)
    e.target.value = ''
  }

  return (
    <Card title={t('settingsPage.profile.cardTitle')}>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#999]">
            {t('settingsPage.profile.photoLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectAvatar(null)}
              disabled={avatarSaving}
              title={t('settingsPage.profile.defaultInitial')}
              className={`rounded-full transition disabled:opacity-50 ${
                !profile?.avatar_url ? 'ring-2 ring-[#f5a623] ring-offset-2 ring-offset-[#111]' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Avatar avatarUrl={null} fallbackLetter={profile?.username?.[0]} className="h-11 w-11 rounded-full text-sm text-white" />
            </button>
            {AVATAR_PRESETS.map((preset) => {
              const value = presetToAvatarUrl(preset.id)
              const selected = profile?.avatar_url === value
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAvatar(value)}
                  disabled={avatarSaving}
                  title={preset.id}
                  className={`rounded-full transition disabled:opacity-50 ${
                    selected ? 'ring-2 ring-[#f5a623] ring-offset-2 ring-offset-[#111]' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Avatar avatarUrl={value} className="h-11 w-11 rounded-full text-lg" />
                </button>
              )
            })}
            <label
              title={t('settingsPage.profile.uploadPhoto')}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[#333] text-base text-[#888] transition hover:border-[#f5a623] hover:text-[#f5a623] ${
                avatarSaving ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }`}
            >
              📤
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleUploadPhoto}
                disabled={avatarSaving}
                className="hidden"
              />
            </label>
          </div>
          {avatarError && <p className="mt-2 text-xs text-red-400">{avatarError}</p>}
        </div>
        <Field label={t('settingsPage.profile.displayName')} value={displayName} onChange={setDisplayName} placeholder={t('settingsPage.profile.displayNamePlaceholder')} />
        <Field
          label={t('settingsPage.profile.username')}
          value={username}
          onChange={setUsername}
          placeholder={t('settingsPage.profile.usernamePlaceholder')}
          hint={t('settingsPage.profile.usernameHint')}
        />
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#999]">{t('settingsPage.profile.bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('settingsPage.profile.bioPlaceholder')}
            rows={3}
            className="w-full resize-none rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
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
            {t('settingsPage.profile.publicCollection', { visibility: isPublic ? t('settingsPage.profile.visiblePublic') : t('settingsPage.profile.visiblePrivate') })}
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
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [token, setToken] = useState(profile?.discogs_token || '')
  const [discogsUsername, setDiscogsUsername] = useState(profile?.discogs_username || '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  async function handleSave() {
    if (!token.trim() || !discogsUsername.trim()) {
      setStatus({ type: 'error', msg: t('settingsPage.discogs.requiredError') })
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
    else setStatus({ type: 'success', msg: t('settingsPage.discogs.updated') })
  }

  async function handleRemove() {
    setSaving(true)
    setStatus(null)
    setConfirmingRemove(false)

    // La collection et la wantlist ne viennent que de Discogs (pas d'ajout
    // manuel pour l'instant) — déconnecter le compte doit donc aussi les vider,
    // sans quoi elles resteraient affichées alors que la source a disparu.
    const [{ error: vinylError }, { error: wantlistError }] = await Promise.all([
      supabase.from('vinyl_records').delete().eq('user_id', profile.id),
      supabase.from('wantlist_items').delete().eq('user_id', profile.id),
    ])
    const { error } = await updateProfile({ discogs_token: null, discogs_username: null })
    setSaving(false)

    if (error || vinylError || wantlistError) {
      setStatus({ type: 'error', msg: (error || vinylError || wantlistError).message })
      return
    }
    setToken('')
    setDiscogsUsername('')
    qc.invalidateQueries({ queryKey: ['collection'] })
    qc.invalidateQueries({ queryKey: ['wantlist'] })
    setStatus({ type: 'success', msg: t('settingsPage.discogs.removed') })
  }

  return (
    <Card title={t('settingsPage.discogs.cardTitle')}>
      <p className="mb-4 text-sm text-[#999]">
        {t('settingsPage.discogs.generateToken')}{' '}
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
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#999]">
            {t('settingsPage.discogs.tokenLabel')}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('settingsPage.discogs.tokenPlaceholder')}
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-white transition"
            >
              {showToken ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <Field
          label={t('settingsPage.discogs.usernameLabel')}
          value={discogsUsername}
          onChange={setDiscogsUsername}
          placeholder={t('settingsPage.discogs.usernamePlaceholder')}
          hint={t('settingsPage.discogs.usernameHint')}
        />
      </div>
      {confirmingRemove && (
        <p className="mt-4 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
          {t('settingsPage.discogs.removeConfirm')}
        </p>
      )}
      <StatusRow status={status} />
      <div className="flex items-center gap-3">
        <SaveBtn onClick={handleSave} saving={saving} />
        {profile?.discogs_token && (
          confirmingRemove ? (
            <>
              <button
                onClick={handleRemove}
                disabled={saving}
                className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {saving ? t('settingsPage.discogs.removing') : t('common.confirm')}
              </button>
              <button
                onClick={() => setConfirmingRemove(false)}
                disabled={saving}
                className="mt-5 rounded-lg px-5 py-2.5 text-sm text-[#999] transition hover:text-white"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingRemove(true)}
              className="mt-5 rounded-lg border border-red-500/30 px-5 py-2.5 text-sm text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
            >
              {t('settingsPage.discogs.removeToken')}
            </button>
          )
        )}
      </div>
    </Card>
  )
}

// ── Section Mot de passe ───────────────────────────────────────────────────

function PasswordSection() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave() {
    if (!next || next.length < 6) {
      setStatus({ type: 'error', msg: t('settingsPage.password.tooShort') })
      return
    }
    if (next !== confirm) {
      setStatus({ type: 'error', msg: t('settingsPage.password.mismatch') })
      return
    }
    setSaving(true)
    setStatus(null)
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) setStatus({ type: 'error', msg: error.message })
    else {
      setStatus({ type: 'success', msg: t('settingsPage.password.updated') })
      setCurrent(''); setNext(''); setConfirm('')
    }
  }

  return (
    <Card title={t('settingsPage.password.cardTitle')}>
      <div className="space-y-4">
        <PasswordField label={t('settingsPage.password.newPassword')} value={next} onChange={setNext} placeholder="••••••••" />
        <PasswordField label={t('settingsPage.password.confirmPassword')} value={confirm} onChange={setConfirm} placeholder="••••••••" />
      </div>
      <StatusRow status={status} />
      <SaveBtn onClick={handleSave} saving={saving} label={t('settingsPage.password.changeButton')} />
    </Card>
  )
}

// ── Section Danger ─────────────────────────────────────────────────────────

function DangerSection({ signOut, navigate, profile }) {
  const { t } = useTranslation()
  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <Card title={t('settingsPage.session.cardTitle')}>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-red-500/30 px-5 py-2.5 text-sm text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
        >
          {t('settingsPage.session.signOut')}
        </button>
      </Card>
      <DeleteAccountSection username={profile?.username} signOut={signOut} navigate={navigate} />
    </>
  )
}

// ── Section suppression de compte ────────────────────────────────────────────

function DeleteAccountSection({ username, signOut, navigate }) {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const { error: err } = await supabase.functions.invoke('delete-account')
    if (err) {
      setError(t('settingsPage.deleteAccount.error'))
      setDeleting(false)
      return
    }
    await signOut()
    navigate('/')
  }

  return (
    <Card title={t('settingsPage.deleteAccount.cardTitle')}>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-500/30 px-5 py-2.5 text-sm text-red-400 transition hover:border-red-500/60 hover:bg-red-500/10"
        >
          {t('settingsPage.deleteAccount.button')}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-400">
            {t('settingsPage.deleteAccount.warning')}{' '}
            {t('settingsPage.deleteAccount.typeToConfirmPrefix')} <strong className="text-white">{username}</strong> {t('settingsPage.deleteAccount.typeToConfirmSuffix')}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={username}
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#888] outline-none focus:border-red-500 transition"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== username || deleting}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              {deleting ? t('settingsPage.deleteAccount.deleting') : t('settingsPage.deleteAccount.confirmButton')}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); setError('') }}
              className="rounded-lg px-5 py-2.5 text-sm text-[#999] transition hover:text-white"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
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
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#999]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
      />
      {hint && <p className="mt-1 text-xs text-[#999]">{hint}</p>}
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#999]">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 pr-11 text-sm text-white placeholder-[#888] outline-none focus:border-[#f5a623] transition"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-white transition"
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

function SaveBtn({ onClick, saving, label }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="mt-5 rounded-lg bg-[#f5a623] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#fbbf24] disabled:opacity-50"
    >
      {saving ? t('common.saving') : (label ?? t('common.save'))}
    </button>
  )
}
