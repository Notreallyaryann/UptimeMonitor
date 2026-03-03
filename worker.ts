import { config } from 'dotenv'
config({ path: '.env.local' })

import { checkAllDueUrls } from './lib/url-checker'

checkAllDueUrls().then(() => {
    console.log(' Check completed')
    process.exit(0)
}).catch(error => {
    console.error(' Fatal error:', error)
    process.exit(1)
})