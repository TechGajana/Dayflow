import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'dayflow.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), employee_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','hr','manager','employee')), is_verified INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(company_id,email));
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, phone TEXT, address TEXT, profile_picture_url TEXT, dob TEXT, designation TEXT, department TEXT, joining_date TEXT, manager_id TEXT);
CREATE TABLE IF NOT EXISTS salaries (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, basic INTEGER NOT NULL DEFAULT 0, hra INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, net_pay INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, check_in TEXT, check_out TEXT, status TEXT NOT NULL DEFAULT 'present');
CREATE TABLE IF NOT EXISTS leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, remarks TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_comment TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id), actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS verification_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id,date);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
`)

const company = db.prepare('SELECT id FROM companies WHERE slug = ?').get('dayflow-demo') as { id: string } | undefined
if (!company) {
  const companyId = 'company-dayflow'
  db.prepare('INSERT INTO companies (id,name,slug) VALUES (?,?,?)').run(companyId, 'Northstar Labs', 'dayflow-demo')
  const employees = [
    ['u1','DF-001','Alex Morgan','admin@dayflow.com','admin','Operations','Head of People',8200],
    ['u2','DF-002','Priya Shah','priya@dayflow.com','hr','People','HR Business Partner',5400],
    ['u3','DF-003','Jordan Lee','jordan@dayflow.com','employee','Engineering','Product Designer',6200],
    ['u4','DF-004','Maya Wilson','maya@dayflow.com','employee','Marketing','Marketing Lead',5800],
    ['u5','DF-005','Noah Williams','noah@dayflow.com','manager','Engineering','Engineering Manager',7600],
    ['u6','DF-006','Sofia Chen','sofia@dayflow.com','employee','Finance','Financial Analyst',5100],
  ]
  const insertUser = db.prepare('INSERT INTO users (id,company_id,employee_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?,?)')
  const insertProfile = db.prepare('INSERT INTO profiles (user_id,phone,designation,department,joining_date) VALUES (?,?,?,?,?)')
  const insertSalary = db.prepare('INSERT INTO salaries (user_id,basic,hra,allowances,deductions,net_pay) VALUES (?,?,?,?,?,?)')
  for (const [id, employeeId, name, email, role, department, designation, salary] of employees) {
    insertUser.run(id, companyId, employeeId, name, email, 'demo-password-hash', role)
    insertProfile.run(id, '+1 415 555 0100', designation, department, '2023-03-15')
    insertSalary.run(id, Math.round(Number(salary)*0.7), Math.round(Number(salary)*0.2), Math.round(Number(salary)*0.1), 350, Number(salary)-350)
  }
  const today = new Date().toISOString().slice(0,10)
  for (const id of ['u1','u2','u3','u4','u5']) db.prepare('INSERT INTO attendance (user_id,date,check_in,status) VALUES (?,?,?,?)').run(id,today,'08:5'+(Number(id.slice(1))+1),'present')
  db.prepare('INSERT INTO leave_requests (user_id,leave_type,start_date,end_date,remarks,status) VALUES (?,?,?,?,?,?)').run('u3','Paid','2026-08-25','2026-08-27','Family event','pending')
  db.prepare('INSERT INTO leave_requests (user_id,leave_type,start_date,end_date,remarks,status) VALUES (?,?,?,?,?,?)').run('u4','Sick','2026-08-19','2026-08-20','Not feeling well','approved')
}

export default db
export type Db = typeof db
