import { NextRequest } from 'next/server'
import { verifyToken } from './auth'

export async function getUserFromRequest(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.split(' ')[1]
    return verifyToken(token)
}