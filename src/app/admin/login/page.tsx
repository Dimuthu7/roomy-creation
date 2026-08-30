'use client'
import { useActionState } from 'react'
import { SubmitButtonLabel } from '@/components/admin/SubmitButtonLabel'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-6">
      <form
        action={formAction}
        className="on-paper w-full max-w-sm space-y-6 border-2 border-navy bg-paper p-8 text-navy"
      >
        <div>
          <h1 className="font-display text-2xl text-navy">Admin login</h1>
          <p className="u-mono mt-1 text-navy/70">Roomy Creations site admin</p>
        </div>

        <div>
          <label htmlFor="username" className="u-mono block">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            aria-invalid={state.error ? true : undefined}
            className="mt-2 w-full border border-navy bg-transparent p-3 text-navy aria-[invalid=true]:border-red-700"
          />
        </div>

        <div>
          <label htmlFor="password" className="u-mono block">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'login-error' : undefined}
            className="mt-2 w-full border border-navy bg-transparent p-3 text-navy aria-[invalid=true]:border-red-700"
          />
        </div>

        {state.error && (
          <p id="login-error" role="alert" className="u-mono border border-red-700 p-3 text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-yellow px-6 py-4 font-display text-navy transition duration-200 hover:bg-yellow/80 active:scale-95 disabled:opacity-60"
        >
          <SubmitButtonLabel pending={pending} label="Sign in" pendingLabel="Signing in" />
        </button>
      </form>
    </main>
  )
}
