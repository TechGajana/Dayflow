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
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), employee_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','hr','manager','employee')), is_verified INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(company_id,email));
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, phone TEXT, address TEXT, profile_picture_url TEXT, dob TEXT, designation TEXT, department TEXT, joining_date TEXT, manager_id TEXT);
CREATE TABLE IF NOT EXISTS salaries (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, basic INTEGER NOT NULL DEFAULT 0, hra INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, net_pay INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, check_in TEXT, check_out TEXT, status TEXT NOT NULL DEFAULT 'present');
CREATE TABLE IF NOT EXISTS leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, remarks TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_comment TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id), actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS verification_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS job_postings (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, title TEXT NOT NULL, department TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS performance_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), notes TEXT, review_date TEXT NOT NULL DEFAULT CURRENT_DATE);
CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, name TEXT NOT NULL, assigned_to TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'available', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, description TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id,date);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
`)

for (const column of ['must_change_password INTEGER NOT NULL DEFAULT 0']) {
	try { db.exec(`ALTER TABLE users ADD COLUMN ${column}`) } catch {}
}
for (const column of ['personal_email TEXT', 'gender TEXT', 'marital_status TEXT', 'about TEXT', 'skills TEXT', 'job_love TEXT', 'certifications TEXT', 'interests TEXT']) {
	try { db.exec(`ALTER TABLE profiles ADD COLUMN ${column}`) } catch {}
}

const demoCompany = db.prepare("SELECT id FROM companies WHERE slug='dayflow-demo'").get() as { id: string } | undefined
if (demoCompany) {
	db.transaction(() => {
		db.prepare('DELETE FROM attendance WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM leave_requests WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM audit_logs WHERE company_id=?').run(demoCompany.id)
		db.prepare('DELETE FROM verification_tokens WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM salaries WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE company_id=?)').run(demoCompany.id)
		db.prepare('DELETE FROM users WHERE company_id=?').run(demoCompany.id)
		db.prepare('DELETE FROM companies WHERE id=?').run(demoCompany.id)
	})()
}

export default db
export type Db = typeof db
