'use client'

import { useForm } from 'react-hook-form'
import axios from 'axios'
import { useState } from 'react'

export default function AddUrlForm({ onAdded }: { onAdded: () => void }) {
    const [isLoading, setIsLoading] = useState(false)
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            url: '',
            checkInterval: 5,
            timeout: 10,
            expectedStatus: 200
        }
    })

    const onSubmit = async (data: any) => {
        setIsLoading(true)
        try {
            await axios.post('/api/urls', data)
            reset()
            onAdded()
        } catch (err: any) {
            console.error(err)
            alert(err.response?.data?.error || 'Failed to add URL')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website URL</label>
                    <input
                        {...register('url', { required: 'URL is required' })}
                        type="url"
                        placeholder="https://example.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 font-medium"
                    />
                    {errors.url && <p className="mt-1 text-sm text-red-500">{errors.url.message as string}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Check Interval (min)</label>
                    <input
                        {...register('checkInterval', { valueAsNumber: true, min: 1 })}
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeout (sec)</label>
                    <input
                        {...register('timeout', { valueAsNumber: true, min: 1 })}
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Status</label>
                    <input
                        {...register('expectedStatus', { valueAsNumber: true })}
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 font-medium"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Adding...</span>
                    </div>
                ) : (
                    'Start Monitoring'
                )}
            </button>
        </form>
    )
}