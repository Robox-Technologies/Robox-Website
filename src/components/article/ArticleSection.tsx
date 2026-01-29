interface ArticleSectionProps {
    id?: string;
    children: React.ReactNode;
    direction: 'RTL' | 'LTR';
}

export default function ArticleSection({ id, direction='LTR', children }: ArticleSectionProps) {
    const isRTL = direction === 'RTL';
    return (
        <section {...(id ? { id } : {})} className={`lg:items-start flex gap-12 justify-between items-center my-16 px-4 ${isRTL ? ' flex-col lg:flex-row-reverse' : ' flex-col-reverse lg:flex-row'}`}>
            {children}
        </section>
    )
}