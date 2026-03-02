import dotenv from 'dotenv'
// Load environment variables
dotenv.config({ path: '.env.local' })

const { checkQueue } = await import('./lib/queue.ts')
const { prisma } = await import('./lib/prisma.ts')
import axios from 'axios'
import nodemailer from 'nodemailer'
import cron from 'node-cron'

// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Process a single URL check
checkQueue.process(async (job) => {
    const { urlId } = job.data
    console.log(`Processing URL check for ID ${urlId}...`)
    const urlEntry = await prisma.monitoredUrl.findUnique({
        where: { id: urlId },
        include: { user: true }
    })
    if (!urlEntry || !urlEntry.isActive) return

    const start = Date.now()
    let isSuccess = false
    let statusCode = null
    let errorMessage = null

    try {
        const response = await axios.get(urlEntry.url, {
            timeout: urlEntry.timeout * 1000,
            validateStatus: () => true, // don't throw on non-2xx
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        })
        statusCode = response.status
        // Consider any 2xx or 3xx success if 200 is expected.
        if (urlEntry.expectedStatus === 200) {
            isSuccess = statusCode >= 200 && statusCode < 400
        } else {
            isSuccess = statusCode === urlEntry.expectedStatus
        }
        console.log(`URL ${urlEntry.url} returned status ${statusCode}. Expected ${urlEntry.expectedStatus}. Result: ${isSuccess}`)
    } catch (error: any) {
        errorMessage = error.message
        isSuccess = false
        console.error(`Error checking URL ${urlEntry.url}: ${errorMessage}`)
    }
    const responseTime = Date.now() - start

    // Save log
    await prisma.checkLog.create({
        data: {
            urlId,
            responseTimeMs: responseTime,
            statusCode,
            errorMessage,
            isSuccess
        }
    })

    // Get previous status
    const previousStatus = urlEntry.lastStatus
    await prisma.monitoredUrl.update({
        where: { id: urlId },
        data: {
            lastCheckedAt: new Date(),
            lastStatus: isSuccess
        }
    })

    // Alerting logic refined
    if (isSuccess === false) {
        // Find existing unresolved alert
        const activeAlert = await prisma.alert.findFirst({
            where: { urlId, resolvedAt: null }
        })

        if (!activeAlert || !activeAlert.notificationSent) {
            console.log(`Handling alert for ${urlEntry.url}...`)

            let alertId = activeAlert?.id
            if (!alertId) {
                const newAlert = await prisma.alert.create({
                    data: { urlId, triggeredAt: new Date() }
                })
                alertId = newAlert.id
            }

            // Send email
            const mailOptions = {
                from: process.env.FROM_EMAIL,
                to: urlEntry.user.email,
                subject: `Uptime Alert: ${urlEntry.url} is DOWN`,
                text: `Your URL ${urlEntry.url} is down. Error: ${errorMessage || 'Status Code: ' + statusCode}`
            }

            try {
                await transporter.sendMail(mailOptions)
                await prisma.alert.update({
                    where: { id: alertId },
                    data: { notificationSent: true }
                })
                console.log(`Alert notification sent for ${urlEntry.url}`)
            } catch (emailError) {
                console.error(`Failed to send email for ${urlEntry.url}:`, emailError)
            }
        }
    } else {
        // If recovered, resolve alert
        const resolved = await prisma.alert.updateMany({
            where: { urlId, resolvedAt: null },
            data: { resolvedAt: new Date() }
        })
        if (resolved.count > 0) {
            console.log(`Resource recovered: ${urlEntry.url}. Alert resolved.`)
        }
    }
    console.log(`Completed URL check for ID ${urlId}: ${isSuccess ? 'UP' : 'DOWN'}`)
})

console.log('Worker started')

// Run every minute
cron.schedule('* * * * *', async () => {
    console.log('Checking for due URLs...')
    const now = new Date()
    const dueUrls = await prisma.monitoredUrl.findMany({
        where: {
            isActive: true,
            OR: [
                { lastCheckedAt: null },
                {
                    lastCheckedAt: {
                        lte: new Date(now.getTime() - 60000) // fallback if interval not used
                    }
                }
            ]
        }
    })

    for (const url of dueUrls) {
        // Check if it's really due based on interval
        if (url.lastCheckedAt) {
            const nextCheck = new Date(url.lastCheckedAt.getTime() + url.checkInterval * 60000)
            if (nextCheck > now) continue
        }
        await checkQueue.add({ urlId: url.id })
        console.log(`Queued check for URL ID ${url.id}: ${url.url}`)
    }
})