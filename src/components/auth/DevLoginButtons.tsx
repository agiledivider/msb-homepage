'use client'

import { useState } from 'react'
import type { DevAccount } from '@/lib/devLogin'

export function DevLoginButtons({ accounts }: { accounts: { who: DevAccount; label: string }[] }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginAs = async (who: DevAccount) => {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/dev/login-as', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ who }),
    })
    if (res.ok) {
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      window.location.href = redirect?.startsWith('/') ? redirect : '/admin'
      return
    }
    setError((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`)
    setBusy(false)
  }

  return (
    <div
      style={{
        marginTop: 'var(--base)',
        padding: 'calc(var(--base) / 2)',
        border: '1px dashed var(--theme-elevation-250)',
        borderRadius: 4,
      }}
    >
      <div style={{ fontSize: 'small', color: 'var(--theme-elevation-500)', marginBottom: 'calc(var(--base) / 2)' }}>
        Nur in der Entwicklung: anmelden
      </div>
      <div style={{ display: 'flex', gap: 'calc(var(--base) / 2)', flexWrap: 'wrap' }}>
        {accounts.map((a) => (
          <button
            key={a.who}
            type="button"
            className="btn btn--style-secondary btn--size-medium"
            style={{ margin: 0 }}
            disabled={busy}
            onClick={() => loginAs(a.who)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error ? <p style={{ margin: '8px 0 0', fontSize: 'small', color: 'var(--theme-error-500)' }}>{error}</p> : null}
    </div>
  )
}
