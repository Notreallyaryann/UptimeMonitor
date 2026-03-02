import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const PUT = auth(async (req, ctx) => {
    if (!req.auth?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await ctx.params
    const { id } = params as { id: string }
    const urlId = parseInt(id)

    if (isNaN(urlId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { id: _, ...data } = await req.json()

    try {
        const updated = await prisma.monitoredUrl.updateMany({
            where: { id: urlId, userId: req.auth.user.id as string },
            data
        })
        if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 })
    }
})

export const DELETE = auth(async (req, ctx) => {
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
        const deleted = await prisma.monitoredUrl.deleteMany({
            where: { id: urlId, userId: req.auth.user.id as string }
        })
        if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 })
    }
})