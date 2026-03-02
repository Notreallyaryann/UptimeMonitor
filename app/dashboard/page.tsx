'use client'

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from 'react'
import axios from 'axios'
import AddUrlForm from '@/app/Components/AddUrlForm'
import UrlList from '@/app/Components/UrlList'
import { useRouter } from "next/navigation"

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [urls, setUrls] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchUrls = async () => {
        try {
            const res = await axios.get('/api/urls')
            setUrls(res.data)
        } catch (error) {
            console.error("Failed to fetch URLs", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === "authenticated") {
            fetchUrls()
        } else if (status === "unauthenticated") {
            router.push("/login")
        }
    }, [status, router])

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session) return null

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        {session.user?.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                className="h-12 w-12 rounded-full border-2 border-indigo-100"
                            />
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                                {session.user?.name?.[0] || session.user?.email?.[0] || "?"}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Dashboard
                            </h1>
                            <p className="text-sm text-gray-500">
                                Welcome back, {session.user?.name || session.user?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </header>

                <main className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Monitor</h2>
                        <AddUrlForm onAdded={fetchUrls} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Monitors</h2>
                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <UrlList urls={urls} onUpdate={fetchUrls} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}