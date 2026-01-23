interface ArticleSectionProps {
    id: string;
    children: React.ReactNode;
    direction: 'RTL' | 'LTR';
}

export default function ArticleSection({ id, direction='LTR', children }: ArticleSectionProps) {
    return (
        <section id={id} className="items-start flex gap-12 justify-between my-16 px-4" style={{ flexDirection: direction === 'LTR' ? 'row' : 'row-reverse' }}>
            {children}
        </section>
    )
}