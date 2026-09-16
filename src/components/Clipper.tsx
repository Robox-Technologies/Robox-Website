//A generic component that can generate the slanted line clipping effect used in various parts of the site
interface ClipperProps {
    className?: string
    style?: React.CSSProperties
    overhang?: string
    side?: 'left' | 'right'
    gradient?: 'positive' | 'negative'
    children?: React.ReactNode
}
export default function Clipper({
    className,
    overhang = '20px',
    style,
    side = 'right',
    gradient = 'positive',
    children,
}: ClipperProps) {
    const clipPath =
        side === 'right'
            ? gradient === 'positive'
                ? `polygon(0 0, 100% 0, calc(100% - ${overhang}) 100%, 0 100%)`
                : `polygon(0 0, calc(100% - ${overhang}) 0, 100% 100%, 0 100%)`
            : gradient === 'positive'
              ? `polygon(${overhang} 0, 100% 0, 100% 100%, 0 100%)`
              : `polygon(0 0, 100% 0, 100% 100%, ${overhang} 100%)`

    return (
        <div className={className} style={{ clipPath, ...style }}>
            {children}
        </div>
    )
}
