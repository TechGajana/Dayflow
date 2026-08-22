import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import db from '@/lib/db'
import { readSession } from '@/lib/auth'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('check-in') }),
  z.object({ action: z.literal('check-out') }),
  z.object({ action: z.literal('leave-status'), id: z.number().int(), status: z.enum(['approved', 'rejected']) }),
  z.object({ action: z.literal('leave-request'), leaveType: z.string().min(1).max(50), startDate: z.string().date(), endDate: z.string().date(), remarks: z.string().max(500).optional() }),
])

async function currentUser() {
  return readSession((await cookies()).get('dayflow_session')?.value)
}

function today() { return new Date().toISOString().slice(0, 10) }
function timeNow() { return new Date().toISOString().slice(11, 16) }

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const date = today()
  const employees = db.prepare(`SELECT u.id, u.employee_id employeeId, u.name, u.role, p.designation, p.department,
    a.check_in checkIn, a.check_out checkOut, a.status attendanceStatus
    FROM users u LEFT JOIN profiles p ON p.user_id=u.id
    LEFT JOIN attendance a ON a.user_id=u.id AND a.date=? WHERE u.company_id=? ORDER BY u.name`).all(date, user.companyId) as any[]
  const leaves = db.prepare(`SELECT l.id, u.name, l.leave_type leaveType, l.start_date startDate, l.end_date endDate,
    l.remarks, l.status, l.created_at createdAt FROM leave_requests l JOIN users u ON u.id=l.user_id
    WHERE u.company_id=? ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, l.created_at DESC LIMIT 20`).all(user.companyId) as any[]
  const trend = db.prepare(`SELECT date, COUNT(*) total, SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) present
    FROM attendance WHERE user_id IN (SELECT id FROM users WHERE company_id=?) AND date >= date('now','-6 day') GROUP BY date ORDER BY date`).all(user.companyId) as any[]
  const attendance = employees.filter((employee) => employee.checkIn).length
  const onLeave = db.prepare(`SELECT COUNT(*) count FROM leave_requests l JOIN users u ON u.id=l.user_id
    WHERE u.company_id=? AND l.status='approved' AND l.start_date<=? AND l.end_date>=?`).get(user.companyId, date, date) as { count: number }
  const pending = db.prepare(`SELECT COUNT(*) count FROM leave_requests l JOIN users u ON u.id=l.user_id WHERE u.company_id=? AND l.status='pending'`).get(user.companyId) as { count: number }
  const ownAttendance = employees.find((employee) => employee.id === user.id)
  return NextResponse.json({ date, employees, leaves, trend, metrics: { totalEmployees: employees.length, presentToday: attendance, onLeaveToday: onLeave.count, pendingApprovals: pending.count }, ownAttendance })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = actionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const data = parsed.data
  const date = today()
  try {
    if (data.action === 'check-in') {
      const checkIn = timeNow()
      db.transaction(() => {
        const result = db.prepare('UPDATE attendance SET check_in=?, status=\'present\' WHERE user_id=? AND date=?').run(checkIn, user.id, date)
        if (!result.changes) db.prepare("INSERT INTO attendance (user_id,date,check_in,status) VALUES (?,?,?,'present')").run(user.id, date, checkIn)
      })()
    } else if (data.action === 'check-out') {
      db.prepare('UPDATE attendance SET check_out=? WHERE user_id=? AND date=?').run(timeNow(), user.id, date)
    } else if (data.action === 'leave-request') {
      if (data.endDate < data.startDate) return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 })
      db.prepare('INSERT INTO leave_requests (user_id,leave_type,start_date,end_date,remarks) VALUES (?,?,?,?,?)').run(user.id, data.leaveType, data.startDate, data.endDate, data.remarks || null)
    } else {
      if (!['admin', 'hr', 'manager'].includes(user.role)) return NextResponse.json({ error: 'You cannot approve leave requests.' }, { status: 403 })
      const result = db.prepare(`UPDATE leave_requests SET status=?, admin_comment=? WHERE id=? AND user_id IN (SELECT id FROM users WHERE company_id=?)`).run(data.status, `Updated by ${user.name}`, data.id, user.companyId)
      if (!result.changes) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to update this record.' }, { status: 409 })
  }
}