import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const userData = await getUserFromRequest(req)
    if (!userData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { id: userData.userId },
        select: { id: true, email: true, createdAt: true }
    })
    return NextResponse.json(user)
}