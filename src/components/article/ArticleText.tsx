export default function ArticleText({ children }: { children: React.ReactNode }) {
    return (
        <div className="prose prose-lg max-w-3xl text-gray-800 leading-[150%]">
            {children}
        </div>
    )
}