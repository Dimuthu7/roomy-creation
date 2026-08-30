'use server'
import { redirect } from 'next/navigation'
import { checkCredentials, createSession } from '@/lib/adminAuth'

export interface LoginState {
  error?: string
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  // Generic message either way — confirming which field was wrong would help
  // someone guessing credentials.
  if (!username || !password || !checkCredentials(username, password)) {
    return { error: 'Invalid username or password.' }
  }

  await createSession()
  redirect('/admin')
}
