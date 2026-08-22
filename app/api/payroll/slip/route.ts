import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(request: Request) {
  const user = await readSession((await cookies()).get('dayflow_session')?.value)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const targetId = new URL(request.url).searchParams.get('userId') || user.id
  if (targetId !== user.id && !['admin', 'hr'].includes(user.role)) return NextResponse.json({ error: 'You can only download your own payslip.' }, { status: 403 })
  const payroll = db.prepare(`SELECT u.name, u.employee_id employeeId, c.name companyName, s.basic, s.hra, s.allowances, s.deductions, s.net_pay netPay FROM salaries s JOIN users u ON u.id=s.user_id JOIN companies c ON c.id=u.company_id WHERE u.id=? AND u.company_id=?`).get(targetId, user.companyId) as any
  if (!payroll) return NextResponse.json({ error: 'No payroll record found.' }, { status: 404 })
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip - ${payroll.name}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;color:#181447}h1{color:#7c3aed}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:bold;color:#7c3aed}</style></head><body><h1>${payroll.companyName}</h1><h2>Monthly Payslip</h2><p>${payroll.name} (${payroll.employeeId})</p><p>Generated ${new Date().toLocaleDateString()}</p><div class="row"><span>Basic salary</span><strong>${payroll.basic}</strong></div><div class="row"><span>House rent allowance</span><strong>${payroll.hra}</strong></div><div class="row"><span>Allowances</span><strong>${payroll.allowances}</strong></div><div class="row"><span>Deductions</span><strong>-${payroll.deductions}</strong></div><div class="row total"><span>Net pay</span><strong>${payroll.netPay}</strong></div></body></html>`
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-disposition': `attachment; filename="payslip-${payroll.employeeId}.html"` } })
}