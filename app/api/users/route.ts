import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { hashPassword, readSession, randomUUID } from '@/lib/auth'
import db from '@/lib/db'

const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
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
  const id = randomUUID(); const employeeId = `EMP-${randomUUID().slice(0, 8).toUpperCase()}`; const passwordHash = await hashPassword(input.password)
  db.transaction(() => {
    db.prepare(`INSERT INTO users (id,company_id,employee_id,name,email,password_hash,role,is_verified) VALUES (?,?,?,?,?,?,?,1)`).run(id, actor.companyId, employeeId, input.name, input.email, passwordHash, input.role)
    db.prepare('INSERT INTO profiles (user_id,department,designation,joining_date) VALUES (?,?,?,?)').run(id, input.department || null, input.designation || null, new Date().toISOString().slice(0, 10))
    db.prepare('INSERT INTO audit_logs (company_id,actor_id,action,entity,entity_id) VALUES (?,?,?,?,?)').run(actor.companyId, actor.id, 'created', 'user', id)
  })()
  return NextResponse.json({ ok: true, user: { id, employeeId, name: input.name, email: input.email, role: input.role } }, { status: 201 })
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