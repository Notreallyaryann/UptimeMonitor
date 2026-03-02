import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const GET = auth(async (req, ctx) => {
    if (!req.auth?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await ctx.params
    const { id } = params as { id: string }
    const urlId = parseInt(id)

    if (isNaN(urlId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    try {
        const url = await prisma.monitoredUrl.findFirst({
            where: { id: urlId, userId: req.auth.user.id as string }
        })
        if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const logs = await prisma.checkLog.findMany({
            where: { urlId },
            orderBy: { checkedAt: 'desc' },
            take: 100
        })
        return NextResponse.json(logs)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }
})