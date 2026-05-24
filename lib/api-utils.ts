import { NextResponse } from 'next/server'
import { auth } from './auth'

export async function requireUserId(): Promise<{ userId: string } | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { userId: session.user.id }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unknown error'
  return NextResponse.json({ error: msg }, { status: 500 })
}
