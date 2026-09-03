import { twMerge } from 'tailwind-merge'

interface CardProps {
    className?: string
    image?: React.ReactNode
    contentClass?: string
    title?: React.ReactNode
    description?: React.ReactNode
    absolute?: React.ReactNode
    children?: React.ReactNode
    /** When set the card element *is* the link, so the whole surface is one target and hover scope. */
    href?: string
    target?: string
    rel?: string
    onClickCapture?: React.MouseEventHandler
    onPointerDown?: React.PointerEventHandler
}
export default function Card({
    href,
    target,
    rel,
    onClickCapture,
    onPointerDown,
    ...props
}: CardProps) {
    const className = twMerge(
        'card flex flex-col overflow-hidden rounded-3xl max-w-[350px]',
        props.className,
    )
    const contents = (
        <>
            {props.absolute}
            {props.image}
            <div className="card-children flex flex-col gap-2 pb-4">
                <div
                    className={`card-content flex flex-col p-4 ${props.contentClass ?? ''}`}
                >
                    <div
                        className={`card-top-row flex justify-between items-center mb-2`}
                    >
                        {props.title}
                    </div>
                    <div className="card-description">{props.description}</div>
                </div>
                {props.children}
            </div>
        </>
    )

    if (href) {
        return (
            <a
                href={href}
                target={target}
                rel={rel}
                onClickCapture={onClickCapture}
                onPointerDown={onPointerDown}
                className={className}
            >
                {contents}
            </a>
        )
    }
    return (
        <div
            onClickCapture={onClickCapture}
            onPointerDown={onPointerDown}
            className={className}
        >
            {contents}
        </div>
    )
}
