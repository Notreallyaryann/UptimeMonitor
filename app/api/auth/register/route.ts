import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()
        const hashed = await hashPassword(password)
        const user = await prisma.user.create({
            data: { email, hashedPassword: hashed }
        })
        return NextResponse.json({ id: user.id, email: user.email })
    } catch (error) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
}