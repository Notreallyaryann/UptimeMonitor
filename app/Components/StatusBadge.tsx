export default function StatusBadge({ status }: { status: boolean | null }) {
    if (status === null) return <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded">Unknown</span>
    return status
        ? <span className="bg-green-200 text-green-800 px-2 py-1 rounded">Up</span>
        : <span className="bg-red-200 text-red-800 px-2 py-1 rounded">Down</span>
}