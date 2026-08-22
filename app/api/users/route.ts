import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createVerification, hashPassword, readSession, randomUUID } from '@/lib/auth'
import db from '@/lib/db'
import { Resend } from 'resend'

const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['hr', 'employee']),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
})

async function session() { return readSession((await cookies()).get('dayflow_session')?.value) }
function canManage(actor: { role: string }, targetRole?: string) {
  return actor.role === 'admin' || (actor.role === 'hr' && targetRole === 'employee')
}

export async function GET() {
  const actor = await session()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = db.prepare(`SELECT u.id, u.employee_id employeeId, u.name, u.email, u.role, u.is_verified verified,
    p.department, p.designation, p.joining_date joiningDate FROM users u LEFT JOIN profiles p ON p.user_id=u.id
    WHERE u.company_id=? ORDER BY u.name`).all(actor.companyId)
  return NextResponse.json({ users, canCreate: actor.role === 'admin' || actor.role === 'hr' })
}

export async function POST(request: Request) {
  const actor = await session()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = userSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Name, email, role, and an 8-character password are required.' }, { status: 400 })
  const input = parsed.data
  if (!canManage(actor, input.role)) return NextResponse.json({ error: 'You do not have permission to create this role.' }, { status: 403 })
  if (db.prepare('SELECT id FROM users WHERE lower(email)=lower(?)').get(input.email)) return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 })
  const company = db.prepare('SELECT name FROM companies WHERE id=?').get(actor.companyId) as { name: string }
  const nameParts = input.name.trim().split(/\s+/); const first = nameParts[0].replace(/[^a-z]/gi, '').toUpperCase(); const last = (nameParts.at(-1) || first).replace(/[^a-z]/gi, '').toUpperCase()
  const companyCode = company.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 4).toUpperCase() || 'CO'
  const year = new Date().getFullYear(); const serial = String((db.prepare('SELECT COUNT(*) count FROM users WHERE company_id=?').get(actor.companyId) as { count: number }).count + 1).padStart(4, '0')
  const employeeId = `${companyCode}${first.slice(0, 2)}${last}${year}${serial}`; const temporaryPassword = `${first.slice(0, 2)}${randomUUID().replaceAll('-', '').slice(0, 8)}!`; const id = randomUUID(); const passwordHash = await hashPassword(temporaryPassword)
  db.transaction(() => {
    db.prepare(`INSERT INTO users (id,company_id,employee_id,name,email,password_hash,role,is_verified,must_change_password) VALUES (?,?,?,?,?,?,?,0,1)`).run(id, actor.companyId, employeeId, input.name, input.email, passwordHash, input.role)
    db.prepare('INSERT INTO profiles (user_id,department,designation,joining_date) VALUES (?,?,?,?)').run(id, input.department || null, input.designation || null, new Date().toISOString().slice(0, 10))
    db.prepare('INSERT INTO audit_logs (company_id,actor_id,action,entity,entity_id) VALUES (?,?,?,?,?)').run(actor.companyId, actor.id, 'created', 'user', id)
  })()
  const verificationToken = createVerification(id)
  const verificationUrl = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL, to: input.email, subject: 'Activate your Dayflow account', html: `<p>Your Dayflow Login ID is <strong>${employeeId}</strong>.</p><p>Activate your account: <a href="${verificationUrl}">Verify email</a></p>` })
  return NextResponse.json({ ok: true, credentials: { loginId: employeeId, temporaryPassword, verificationUrl }, user: { id, employeeId, name: input.name, email: input.email, role: input.role } }, { status: 201 })
}

export async function DELETE(request: Request) {
  const actor = await session()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json())
  if (!parsed.success || parsed.data.id === actor.id) return NextResponse.json({ error: 'Invalid user.' }, { status: 400 })
  const target = db.prepare('SELECT role FROM users WHERE id=? AND company_id=?').get(parsed.data.id, actor.companyId) as { role: string } | undefined
  if (!target || !canManage(actor, target.role)) return NextResponse.json({ error: 'You do not have permission to remove this user.' }, { status: 403 })
  db.prepare('DELETE FROM users WHERE id=? AND company_id=?').run(parsed.data.id, actor.companyId)
  return NextResponse.json({ ok: true })
}