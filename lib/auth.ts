import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export const hashPassword = (password: string) => bcrypt.hash(password, 10)
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash)

export const generateToken = (userId: number, email: string) => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
    } catch {
        return null
    }
}