import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createVerification, hashPassword, randomUUID } from '@/lib/auth'
import db from '@/lib/db'
import { Resend } from 'resend'

const schema = z.object({ companyName:z.string().min(2), name:z.string().min(2), email:z.string().email(), password:z.string().min(8) })
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({error:'Please provide valid details. Passwords must be at least 8 characters.'},{status:400})
  const {companyName,name,email,password}=parsed.data; if (db.prepare('SELECT id FROM users WHERE lower(email)=lower(?)').get(email)) return NextResponse.json({error:'Unable to create account with these details.'},{status:400})
  const companyId=randomUUID(); const userId=randomUUID(); const slug=`${companyName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${randomUUID().slice(0,6)}`
  const passwordHash=await hashPassword(password)
  const tx=db.transaction(()=>{ db.prepare('INSERT INTO companies(id,name,slug) VALUES(?,?,?)').run(companyId,companyName,slug); db.prepare('INSERT INTO users(id,company_id,employee_id,name,email,password_hash,role,is_verified) VALUES(?,?,?,?,?,?,?,0)').run(userId,companyId,'ADMIN-001',name,email,passwordHash,'admin'); db.prepare('INSERT INTO profiles(user_id,designation,department,joining_date) VALUES(?,?,?,?)').run(userId,'Company Administrator','People',new Date().toISOString().slice(0,10)); return createVerification(userId) }); const token=tx()
  const url=`${process.env.BETTER_AUTH_URL||'http://localhost:3000'}/verify-email?token=${token}`
  if(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.RESEND_FROM_EMAIL,to:email,subject:'Verify your Dayflow account',html:`<h2>Welcome to Dayflow</h2><p>Verify your email to activate ${companyName}.</p><p><a href="${url}">Verify email address</a></p>`})
  return NextResponse.json({ok:true,devVerificationUrl:process.env.NODE_ENV==='development'?url:undefined})
}
