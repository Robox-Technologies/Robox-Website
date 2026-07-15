import { twMerge } from 'tailwind-merge'

interface CardProps {
    className?: string
    image?: React.ReactNode
    contentClass?: string
    title?: React.ReactNode
    description?: React.ReactNode
    absolute?: React.ReactNode
    children?: React.ReactNode
}
export default function Card(props: CardProps) {
    return (
        <div
            className={twMerge(
                'card flex flex-col overflow-hidden rounded-3xl max-w-[350px]',
                props.className,
            )}
        >
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
        </div>
    )
}
