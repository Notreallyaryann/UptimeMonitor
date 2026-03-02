
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from './lib/prisma.ts'
import axios from 'axios'
import nodemailer from 'nodemailer'



// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Single function to check ALL due URLs
async function checkAllDueUrls() {
    console.log('🔍 Checking for due URLs...')
    const now = new Date()
    
    // Find all active URLs that need checking
    const dueUrls = await prisma.monitoredUrl.findMany({
        where: {
            isActive: true,
            OR: [
                { lastCheckedAt: null },
                {
                    lastCheckedAt: {
                        lte: new Date(now.getTime() - 60000) // At least 1 min ago
                    }
                }
            ]
        },
        include: { user: true }
    })

    console.log(`Found ${dueUrls.length} URLs to check`)

    for (const urlEntry of dueUrls) {
        // Verify interval
        if (urlEntry.lastCheckedAt) {
            const nextCheck = new Date(urlEntry.lastCheckedAt.getTime() + urlEntry.checkInterval * 60000)
            if (nextCheck > now) continue
        }

        // Check the URL
        await checkSingleUrl(urlEntry)
    }
}

// Process a single URL
async function checkSingleUrl(urlEntry: any) {
    console.log(`Checking URL: ${urlEntry.url}`)
    const start = Date.now()
    let isSuccess = false
    let statusCode = null
    let errorMessage = null

    try {
        const response = await axios.get(urlEntry.url, {
            timeout: urlEntry.timeout * 1000,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        })
        statusCode = response.status
        isSuccess = urlEntry.expectedStatus === 200 
            ? statusCode >= 200 && statusCode < 400
            : statusCode === urlEntry.expectedStatus
    } catch (error: any) {
        errorMessage = error.message
        isSuccess = false
    }
    
    const responseTime = Date.now() - start

    // Save log
    await prisma.checkLog.create({
        data: {
            urlId: urlEntry.id,
            responseTimeMs: responseTime,
            statusCode,
            errorMessage,
            isSuccess
        }
    })

    // Update URL
    await prisma.monitoredUrl.update({
        where: { id: urlEntry.id },
        data: {
            lastCheckedAt: new Date(),
            lastStatus: isSuccess
        }
    })

    // Handle alerts
    if (!isSuccess) {
        await handleAlert(urlEntry, errorMessage, statusCode)
    } else {
        await prisma.alert.updateMany({
            where: { urlId: urlEntry.id, resolvedAt: null },
            data: { resolvedAt: new Date() }
        })
    }
}

async function handleAlert(urlEntry: any, errorMessage: string | null, statusCode: number | null) {
    const activeAlert = await prisma.alert.findFirst({
        where: { urlId: urlEntry.id, resolvedAt: null }
    })

    if (!activeAlert || !activeAlert.notificationSent) {
        let alertId = activeAlert?.id
        
        if (!alertId) {
            const newAlert = await prisma.alert.create({
                data: { urlId: urlEntry.id, triggeredAt: new Date() }
            })
            alertId = newAlert.id
        }

        try {
            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: urlEntry.user.email,
                subject: `Uptime Alert: ${urlEntry.url} is DOWN`,
                text: `Your URL ${urlEntry.url} is down. Error: ${errorMessage || 'Status Code: ' + statusCode}`
            })
            
            await prisma.alert.update({
                where: { id: alertId },
                data: { notificationSent: true }
            })
        } catch (emailError) {
            console.error('Email failed:', emailError)
        }
    }
}


checkAllDueUrls().then(() => {
    console.log('✅ Check completed')
    process.exit(0) 
}).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
})