import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const urlId = parseInt(params.id)
    const data = await req.json()
    const updated = await prisma.monitoredUrl.updateMany({
        where: { id: urlId, userId: user.userId },
        data
    })
    if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const urlId = parseInt(params.id)
    await prisma.monitoredUrl.deleteMany({
        where: { id: urlId, userId: user.userId }
    })
    return NextResponse.json({ success: true })
}