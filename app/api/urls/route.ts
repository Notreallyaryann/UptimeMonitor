import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { checkSingleUrl } from '@/lib/url-checker' 
import { NextResponse } from 'next/server'

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const urls = await prisma.monitoredUrl.findMany({
    where: { userId: req.auth.user.id },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(urls)
})

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { url, checkInterval, timeout, expectedStatus } = await req.json()
    
    // Create the new URL in database
    const newUrl = await prisma.monitoredUrl.create({
      data: {
        userId: req.auth.user.id,
        url,
        checkInterval: Number(checkInterval),
        timeout: Number(timeout),
        expectedStatus: Number(expectedStatus)
      },
      include: { user: true } 
    })

    console.log(`✅ New URL added: ${url}`)

    checkSingleUrl(newUrl).catch(err => {
      console.error(`❌ Initial check failed for ${url}:`, err)
    })

    return NextResponse.json(newUrl)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 })
  }
})