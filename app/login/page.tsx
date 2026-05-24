'use client'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/'
  const error = params.get('error')

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--bg1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--accent)' }}>
            rules/
          </span>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>builder</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Sign in</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            Your projects, Anthropic key, and GitHub-linked repos stay tied to your account.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(220, 60, 60, 0.08)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius)',
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--red)',
            }}
          >
            {error === 'OAuthAccountNotLinked'
              ? 'This email is already linked to a different sign-in method.'
              : 'Sign-in failed. Please try again.'}
          </div>
        )}

        <button
          className="btn btn-accent"
          style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', gap: 8 }}
          onClick={() => signIn('github', { callbackUrl })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.08-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.74.8 1.19 1.82 1.19 3.08 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
          Continue with GitHub
        </button>

        <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, textAlign: 'center' }}>
          We request <code style={{ fontFamily: 'var(--mono)' }}>repo</code> scope so you can push
          generated <code style={{ fontFamily: 'var(--mono)' }}>.mdc</code> files into your repos.
          You can revoke access anytime from GitHub settings.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
