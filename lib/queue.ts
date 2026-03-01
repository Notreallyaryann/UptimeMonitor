import Bull from 'bull'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const checkQueue = new Bull('url checks', REDIS_URL)