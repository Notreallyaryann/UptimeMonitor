import { checkQueue } from './lib/queue'
import { prisma } from './lib/prisma'
import axios from 'axios'
import nodemailer from 'nodemailer'
import cron from 'node-cron'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

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
            validateStatus: () => true // don't throw on non-2xx
        })
        statusCode = response.status
        isSuccess = statusCode === urlEntry.expectedStatus
    } catch (error: any) {
        errorMessage = error.message
        isSuccess = false
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

    // Alert if down and previously up
    if (previousStatus === true && isSuccess === false) {
        const alert = await prisma.alert.create({
            data: {
                urlId,
                triggeredAt: new Date()
            }
        })

        // Send email
        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: urlEntry.user.email,
            subject: `Uptime Alert: ${urlEntry.url} is DOWN`,
            text: `Your URL ${urlEntry.url} is down. Error: ${errorMessage || 'Unknown'}`
        }

        try {
            await transporter.sendMail(mailOptions)
            await prisma.alert.update({
                where: { id: alert.id },
                data: { notificationSent: true }
            })
        } catch (emailError) {
            console.error('Failed to send email:', emailError)
            // Don't update notificationSent if email failed
        }
    }

    // If recovered, resolve alert
    if (previousStatus === false && isSuccess === true) {
        await prisma.alert.updateMany({
            where: { urlId, resolvedAt: null },
            data: { resolvedAt: new Date() }
        })
    }
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