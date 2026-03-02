
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from './lib/prisma.ts'
import axios from 'axios'
import nodemailer from 'nodemailer'
import dns from 'dns' // Added for IPv4 fix

// Email transporter with IPv4 fix
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // Using 587 which often handles IPv4 better
    secure: false, // false for 587
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 30000, // 30 seconds
    socketTimeout: 30000,
    // Force IPv4 to avoid Render's IPv6 connectivity issues
    lookup: (hostname:any, options:any, callback:any) => {
        dns.lookup(hostname, { family: 4 }, callback);
    },
    tls: {
        rejectUnauthorized: false // Helps with some Gmail certificate issues
    }
} as any)

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

    // Process URLs with concurrency of 3 for better performance
    const CONCURRENCY = 3
    for (let i = 0; i < dueUrls.length; i += CONCURRENCY) {
        const batch = dueUrls.slice(i, i + CONCURRENCY)
        console.log(`Processing batch ${i/CONCURRENCY + 1} with ${batch.length} URLs`)
        
        await Promise.all(batch.map(urlEntry => checkSingleUrl(urlEntry)))
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
            timeout: Math.min(urlEntry.timeout * 1000, 10000), // Max 10 seconds per URL
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
    console.log(`📧 handleAlert started for ${urlEntry.url}`)
    
    const activeAlert = await prisma.alert.findFirst({
        where: { urlId: urlEntry.id, resolvedAt: null }
    })
    
    console.log(`📧 Active alert:`, activeAlert)

    if (!activeAlert || !activeAlert.notificationSent) {
        let alertId = activeAlert?.id
        
        if (!alertId) {
            console.log(`📧 Creating new alert record for ${urlEntry.url}`)
            const newAlert = await prisma.alert.create({
                data: { 
                    urlId: urlEntry.id, 
                    triggeredAt: new Date() 
                }
            })
            alertId = newAlert.id
            console.log(`📧 New alert created with ID: ${alertId}`)
        }

        try {
            console.log(`📧 Attempting to send email to ${urlEntry.user.email}`)
            console.log(`📧 Email config:`, {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER,
                from: process.env.FROM_EMAIL,
                to: urlEntry.user.email
            })
            
            const info = await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: urlEntry.user.email,
                subject: `⚠️ Uptime Alert: ${urlEntry.url} is DOWN`,
                text: `Your URL ${urlEntry.url} is down.\n\nError: ${errorMessage || 'Status Code: ' + statusCode}\n\nChecked at: ${new Date().toLocaleString()}`
            })
            
            console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`)
            
            // Update the alert record
            await prisma.alert.update({
                where: { id: alertId },
                data: { 
                    notificationSent: true,
                    // Optionally store the message ID or error details
                }
            })
            console.log(`✅ Alert ${alertId} marked as notificationSent=true`)
            
        } catch (emailError: any) {
            console.error(`❌ EMAIL FAILED for ${urlEntry.url}:`)
            console.error(`Error code:`, emailError.code)
            console.error(`Error message:`, emailError.message)
            console.error(`Error command:`, emailError.command)
            console.error(`Error response:`, emailError.response)
            console.error(`Stack:`, emailError.stack)
            
            // Don't update notificationSent - will retry next time
            console.log(`📧 notificationSent kept as false for retry`)
        }
    } else {
        console.log(`📧 Skipping email - alert already sent for this downtime event`)
    }
}

// Run the check
checkAllDueUrls().then(() => {
    console.log('✅ Check completed')
    process.exit(0) 
}).catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
})