export default function StatusBadge({ status }: { status: boolean | null }) {
    if (status === null) return <span className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-semibold">Unknown</span>
    return status
        ? <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs font-semibold">Up</span>
        : <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs font-semibold">Down</span>
}