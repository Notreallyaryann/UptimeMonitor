import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const urls = await prisma.monitoredUrl.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(urls)
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, checkInterval, timeout, expectedStatus } = await req.json()
  const newUrl = await prisma.monitoredUrl.create({
    data: {
      userId: user.userId,
      url,
      checkInterval,
      timeout,
      expectedStatus
    }
  })
  return NextResponse.json(newUrl)
}