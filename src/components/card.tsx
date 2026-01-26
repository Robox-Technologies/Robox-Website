interface CardProps {
    className?: string;
    image?: React.ReactNode;
    contentClass?: string;
    title?: React.ReactNode;
    description: React.ReactNode;
}
export default function Card(props: CardProps) {
    return (
        <div className={`card flex flex-col overflow-hidden rounded-lg ${props.className ?? ''}`}>
            {props.image}
            <div className={`card-content flex flex-col p-4 ${props.contentClass ?? ''}`}>
                <div className={`card-top-row flex justify-between items-center mb-2`}>
                    {props.title}
                </div>
                <div className="card-description">
                    {props.description}
                </div>
            </div>
        </div>
    );
}