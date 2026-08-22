import { NextResponse } from 'next/server'
import { consumeVerification } from '@/lib/auth'
export async function POST(request:Request){ const {token}=await request.json(); return NextResponse.json({ok:consumeVerification(token)}) }
