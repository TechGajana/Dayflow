import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
export async function GET(){ const token=(await cookies()).get('dayflow_session')?.value; const user=await readSession(token); return NextResponse.json({user}) }
