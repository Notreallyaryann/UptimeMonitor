import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { stdout, stderr } = await execAsync('ts-node worker.ts')
        console.log('Worker output:', stdout)
        if (stderr) console.error('Worker errors:', stderr)
        
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Failed to run worker:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}