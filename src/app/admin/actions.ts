'use server'
import { redirect } from 'next/navigation'
import { destroySession } from '@/lib/adminAuth'

export async function logout(): Promise<void> {
  await destroySession()
  redirect('/admin/login')
}
