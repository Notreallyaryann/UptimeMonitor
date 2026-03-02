'use client'

import axios from 'axios'
import StatusBadge from './StatusBadge'
import { useState, useEffect } from 'react'

export default function UrlList({ urls, onUpdate }: any) {
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    // Poll for updates every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            onUpdate && onUpdate();
        }, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [onUpdate]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this monitor?')) return
        setIsDeleting(id)
        try {
            await axios.delete(`/api/urls/${id}`)
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('Failed to delete monitor')
        } finally {
            setIsDeleting(null)
        }
    }

    if (!urls || urls.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No monitors active</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new URL above.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Monitor</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-center">Interval</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Last Checked</th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {urls.map((url: any) => (
                        <tr key={url.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={url.url}>
                                    {url.url}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {url.checkInterval}m
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <StatusBadge status={url.lastStatus} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {url.lastCheckedAt ? (
                                    <div className="flex flex-col">
                                        <span>{new Date(url.lastCheckedAt).toLocaleDateString()}</span>
                                        <span className="text-xs text-gray-400">{new Date(url.lastCheckedAt).toLocaleTimeString()}</span>
                                    </div>
                                ) : 'Not checked yet'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => handleDelete(url.id)}
                                    disabled={isDeleting === url.id}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}