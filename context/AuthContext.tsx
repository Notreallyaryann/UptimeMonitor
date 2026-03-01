'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface User {
    id: number
    email: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
            setToken(storedToken)
            fetchUser(storedToken)
        }
    }, [])

    const fetchUser = async (jwt: string) => {
        try {
            const res = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${jwt}` }
            })
            setUser(res.data)
        } catch {
            logout()
        }
    }

    const login = async (email: string, password: string) => {
        const res = await axios.post('/api/auth/login', { email, password })
        const { token } = res.data
        localStorage.setItem('token', token)
        setToken(token)
        await fetchUser(token)
        router.push('/dashboard')
    }

    const register = async (email: string, password: string) => {
        await axios.post('/api/auth/register', { email, password })
        await login(email, password)
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        router.push('/')
    }

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)