import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { hashPassword, readSession } from '@/lib/auth'
import db from '@/lib/db'

const schema = z.object({ password: z.string().min(8).max(100) })
export async function POST(request: Request) {
  const token = (await cookies()).get('dayflow_session')?.value
  const user = await readSession(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Password must contain at least 8 characters.' }, { status: 400 })
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?').run(await hashPassword(parsed.data.password), user.id)
  return NextResponse.json({ ok: true })
}