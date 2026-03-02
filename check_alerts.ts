
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })
const prisma = new PrismaClient()

async function main() {
    const alerts = await prisma.alert.findMany({
        include: { url: true }
    })
    console.log(JSON.stringify(alerts, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
