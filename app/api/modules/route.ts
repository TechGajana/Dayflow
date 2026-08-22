import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { readSession } from '@/lib/auth'
import db from '@/lib/db'

const inputSchema = z.object({ module: z.enum(['Recruitment', 'Performance', 'Assets', 'Expenses', 'Payroll']), title: z.string().min(2).max(120).optional(), detail: z.string().max(500).optional(), amount: z.number().int().nonnegative().optional(), userId: z.string().optional(), id: z.number().int().optional(), status: z.enum(['open', 'closed', 'available', 'assigned', 'pending', 'approved', 'rejected']).optional() })
async function session() { return readSession((await cookies()).get('dayflow_session')?.value) }

export async function GET(request: Request) {
  const actor = await session(); if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const module = new URL(request.url).searchParams.get('module')
  if (module === 'Payroll') { const items = ['admin', 'hr'].includes(actor.role) ? db.prepare(`SELECT u.id, u.name, s.basic, s.hra, s.allowances, s.deductions, s.net_pay netPay FROM salaries s JOIN users u ON u.id=s.user_id WHERE u.company_id=? ORDER BY u.name`).all(actor.companyId) : db.prepare(`SELECT u.id, u.name, s.basic, s.hra, s.allowances, s.deductions, s.net_pay netPay FROM salaries s JOIN users u ON u.id=s.user_id WHERE u.id=?`).all(actor.id); return NextResponse.json({ items }) }
  if (module === 'Reports') {
    const totals = db.prepare(`SELECT 'Employees' label, COUNT(*) value FROM users WHERE company_id=? UNION ALL SELECT 'Leave requests', COUNT(*) FROM leave_requests l JOIN users u ON u.id=l.user_id WHERE u.company_id=? UNION ALL SELECT 'Expenses', COUNT(*) FROM expenses WHERE company_id=?`).all(actor.companyId, actor.companyId, actor.companyId)
    const payroll = db.prepare('SELECT COALESCE(SUM(s.net_pay),0) total FROM salaries s JOIN users u ON u.id=s.user_id WHERE u.company_id=?').get(actor.companyId)
    const attendance = db.prepare(`SELECT date label, SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) value FROM attendance WHERE user_id IN (SELECT id FROM users WHERE company_id=?) AND date >= date('now','-6 day') GROUP BY date ORDER BY date`).all(actor.companyId)
    const leaves = db.prepare(`SELECT status label, COUNT(*) value FROM leave_requests l JOIN users u ON u.id=l.user_id WHERE u.company_id=? GROUP BY status`).all(actor.companyId)
    const expenses = db.prepare('SELECT status label, COALESCE(SUM(amount),0) value FROM expenses WHERE company_id=? GROUP BY status').all(actor.companyId)
    return NextResponse.json({ items: totals, payroll, attendance, leaves, expenses })
  }
  const queries: Record<string, string> = {
    Recruitment: 'SELECT id, title, department, status, created_at createdAt FROM job_postings WHERE company_id=? ORDER BY created_at DESC',
    Performance: 'SELECT r.id, r.user_id userId, u.name title, r.rating, r.notes detail, r.review_date createdAt FROM performance_reviews r JOIN users u ON u.id=r.user_id WHERE r.company_id=? ORDER BY r.review_date DESC',
    Assets: 'SELECT a.id, a.name title, a.status, u.name detail, a.assigned_to assignedTo, a.created_at createdAt FROM assets a LEFT JOIN users u ON u.id=a.assigned_to WHERE a.company_id=? ORDER BY a.created_at DESC',
    Expenses: 'SELECT e.id, e.description title, e.amount, e.status, u.name detail, e.created_at createdAt FROM expenses e JOIN users u ON u.id=e.user_id WHERE e.company_id=? ORDER BY e.created_at DESC',
  }
  return NextResponse.json({ items: queries[module || ''] ? db.prepare(queries[module || '']).all(actor.companyId) : [] })
}

export async function POST(request: Request) {
  const actor = await session(); if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = inputSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'Please provide valid record details.' }, { status: 400 })
  const input = parsed.data
  if (!input.id && !input.title) return NextResponse.json({ error: 'A title or description is required.' }, { status: 400 })
  const title = input.title || ''
  if (input.module === 'Payroll') { if (actor.role !== 'admin' || !input.userId || !input.amount || input.amount < 1 || !db.prepare('SELECT id FROM users WHERE id=? AND company_id=?').get(input.userId, actor.companyId)) return NextResponse.json({ error: 'Only admin can set a valid employee wage.' }, { status: 403 }); const basic = Math.round(input.amount * 0.5); const hra = Math.round(basic * 0.5); const allowances = Math.max(0, input.amount - basic - hra); db.prepare(`INSERT INTO salaries (user_id,basic,hra,allowances,deductions,net_pay) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET basic=excluded.basic,hra=excluded.hra,allowances=excluded.allowances,net_pay=excluded.net_pay,updated_at=CURRENT_TIMESTAMP`).run(input.userId, basic, hra, allowances, 0, input.amount); return NextResponse.json({ ok: true }, { status: 201 }) }
  if (input.id && input.status) {
    if (!['admin', 'hr', 'manager'].includes(actor.role)) return NextResponse.json({ error: 'You do not have permission to update records.' }, { status: 403 })
    const table = input.module === 'Recruitment' ? 'job_postings' : input.module === 'Assets' ? 'assets' : input.module === 'Expenses' ? 'expenses' : ''
    if (!table) return NextResponse.json({ error: 'Performance reviews can only be edited through the notes action.' }, { status: 400 })
    const result = db.prepare(`UPDATE ${table} SET status=? WHERE id=? AND company_id=?`).run(input.status, input.id, actor.companyId)
    return result.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Record not found.' }, { status: 404 })
  }
  if (input.module === 'Performance' && input.id) {
    if (!input.detail) return NextResponse.json({ error: 'Performance notes cannot be empty.' }, { status: 400 })
    const result = db.prepare('UPDATE performance_reviews SET notes=? WHERE id=? AND company_id=? AND user_id=?').run(input.detail, input.id, actor.companyId, actor.id)
    return result.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'You can only edit your own performance review.' }, { status: 403 })
  }
  if (input.module !== 'Expenses' && input.module !== 'Performance' && !['admin', 'hr', 'manager'].includes(actor.role)) return NextResponse.json({ error: 'You do not have permission to create this record.' }, { status: 403 })
  if (input.module === 'Recruitment') db.prepare('INSERT INTO job_postings (company_id,title,department) VALUES (?,?,?)').run(actor.companyId, title, input.detail || null)
  if (input.module === 'Performance') { const targetId = ['admin', 'hr', 'manager'].includes(actor.role) ? input.userId : actor.id; if (!targetId || !input.amount || input.amount < 1 || input.amount > 5 || !db.prepare('SELECT id FROM users WHERE id=? AND company_id=?').get(targetId, actor.companyId)) return NextResponse.json({ error: 'Select an employee and rating from 1 to 5.' }, { status: 400 }); db.prepare('INSERT INTO performance_reviews (company_id,user_id,rating,notes) VALUES (?,?,?,?)').run(actor.companyId, targetId, input.amount, input.detail || null) }
  if (input.module === 'Assets') db.prepare('INSERT INTO assets (company_id,name,assigned_to) VALUES (?,?,?)').run(actor.companyId, title, input.userId || null)
  if (input.module === 'Expenses') { if (!input.amount || input.amount < 1) return NextResponse.json({ error: 'Enter an expense amount.' }, { status: 400 }); db.prepare('INSERT INTO expenses (company_id,user_id,description,amount) VALUES (?,?,?,?)').run(actor.companyId, actor.id, title, input.amount) }
  return NextResponse.json({ ok: true }, { status: 201 })
}