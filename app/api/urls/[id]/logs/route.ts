import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const urlId = parseInt(params.id)
    const url = await prisma.monitoredUrl.findFirst({
        where: { id: urlId, userId: user.userId }
    })
    if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const logs = await prisma.checkLog.findMany({
        where: { urlId },
        orderBy: { checkedAt: 'desc' },
        take: 100
    })
    return NextResponse.json(logs)
}