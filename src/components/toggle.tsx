export function Toggle({
    enabled,
    onToggle,
}: {
    enabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className={`w-12 px-0.5 h-6 rounded-full transition-colors ${enabled ? 'bg-black' : 'bg-gray-300'}`}
        >
            <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
            ></div>
        </button>
    )
}
