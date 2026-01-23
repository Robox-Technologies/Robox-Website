export default function ArticleText({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={` max-w-3xl h-fit text-gray-800 flex flex-col gap-8 leading-[150%] ${className ?? ''}`}>
            {children}
        </div>
    )
}