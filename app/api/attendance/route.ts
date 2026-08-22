import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import QRCode from 'qrcode'
import { readSession } from '@/lib/auth'
import db from '@/lib/db'

const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)
function day(value: string) { return new Date(`${value}T00:00:00`) }
function hours(start?: string, end?: string) { if (!start || !end) return 0; const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number); return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60) }
async function session() { return readSession((await cookies()).get('dayflow_session')?.value) }

export async function GET(request: Request) {
  const user = await session(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const month = new URL(request.url).searchParams.get('month') || new Date().toISOString().slice(0, 7); const start = `${month}-01`; const end = `${month}-31`
  const rows = db.prepare(`SELECT a.id, a.user_id userId, u.name, a.date, a.check_in checkIn, a.check_out checkOut, a.status FROM attendance a JOIN users u ON u.id=a.user_id WHERE u.company_id=? AND a.date BETWEEN ? AND ? AND (?='admin' OR ?='hr' OR a.user_id=?) ORDER BY a.date DESC, u.name`).all(user.companyId, start, end, user.role, user.role, user.id) as any[]
  return NextResponse.json({ records: rows.map((row) => ({ ...row, workHours: Number(hours(row.checkIn, row.checkOut).toFixed(2)), overtime: Number(Math.max(0, hours(row.checkIn, row.checkOut) - 8).toFixed(2)) })), month })
}

export async function POST(request: Request) {
  const user = await session(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as { qrToken?: string }
  if (!body.qrToken) return NextResponse.json({ error: 'QR token is required.' }, { status: 400 })
  try { const verified = await jwtVerify(body.qrToken, secret); if (verified.payload.companyId !== user.companyId) throw new Error('Company mismatch') } catch { return NextResponse.json({ error: 'This QR code is invalid or expired.' }, { status: 400 }) }
  const date = new Date().toISOString().slice(0, 10); const time = new Date().toISOString().slice(11, 16); const existing = db.prepare('SELECT id, check_in checkIn, check_out checkOut FROM attendance WHERE user_id=? AND date=?').get(user.id, date) as any
  if (existing?.checkIn) return NextResponse.json({ error: existing.checkOut ? 'Attendance is already complete for today.' : 'You are already checked in.' }, { status: 409 })
  if (existing) db.prepare("UPDATE attendance SET check_in=?, status='present' WHERE id=?").run(time, existing.id); else db.prepare("INSERT INTO attendance (user_id,date,check_in,status) VALUES (?,?,?,'present')").run(user.id, date, time)
  return NextResponse.json({ ok: true, checkIn: time })
}

export async function PUT() {
  const user = await session(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = await new SignJWT({ companyId: user.companyId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m').sign(secret)
  return NextResponse.json({ token, image: await QRCode.toDataURL(token, { width: 260, margin: 2, color: { dark: '#7c3aed', light: '#ffffff' } }) })
}