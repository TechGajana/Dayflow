import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { randomUUID, randomBytes } from 'node:crypto'
import db from '@/lib/db'

const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)
export type SessionUser = { id: string; companyId: string; name: string; email: string; role: string; companyName: string; verified: boolean }

export async function createSession(user: SessionUser) {
  return new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret)
}
export async function readSession(token?: string) { if (!token) return null; try { return (await jwtVerify(token, secret)).payload as unknown as SessionUser } catch { return null } }
export function hashPassword(password: string) { return bcrypt.hash(password, 12) }
export function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash) }
export function getUserByEmail(email: string) { return db.prepare('SELECT u.*, c.name company_name FROM users u JOIN companies c ON c.id=u.company_id WHERE lower(u.email)=lower(?)').get(email) as any }
export function getUserById(id: string) { return db.prepare('SELECT u.*, c.name company_name FROM users u JOIN companies c ON c.id=u.company_id WHERE u.id=?').get(id) as any }
export function toSessionUser(user: any): SessionUser { return { id:user.id, companyId:user.company_id, name:user.name, email:user.email, role:user.role, companyName:user.company_name, verified:Boolean(user.is_verified) } }
export function createVerification(userId: string) { const token = randomBytes(32).toString('hex'); db.prepare('INSERT INTO verification_tokens (token,user_id,expires_at) VALUES (?,?,?)').run(token,userId,new Date(Date.now()+86400000).toISOString()); return token }
export function consumeVerification(token: string) { const row = db.prepare('SELECT * FROM verification_tokens WHERE token=? AND expires_at>?').get(token,new Date().toISOString()) as any; if (!row) return false; db.prepare('UPDATE users SET is_verified=1 WHERE id=?').run(row.user_id); db.prepare('DELETE FROM verification_tokens WHERE token=?').run(token); return true }
export { randomUUID }
