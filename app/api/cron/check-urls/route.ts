import { NextResponse } from 'next/server'
import { checkAllDueUrls } from '@/lib/url-checker'

export const maxDuration = 60;

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Cron triggered at:', new Date().toISOString())

    try {

        await checkAllDueUrls()
        
        return NextResponse.json({ 
            success: true,
            timestamp: new Date().toISOString() 
        })
    } catch (error: any) {
        console.error('❌ Cron failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}