import Clipper from './Clipper'
interface PageHeroProps {
    left?: React.ReactNode
    right?: React.ReactNode
    leftWidth?: string
    className?: string
    gradient?: 'positive' | 'negative'
    overlap?: string
    lineWidth?: string
}

export default function PageHero(props: PageHeroProps) {
    const {
        left,
        right,
        className,
        gradient = 'positive',
        leftWidth = '33%',
        overlap = '10vw',
        lineWidth = '10px',
    } = props
    const isGradientNegative = gradient === 'negative'

    const finalLeftWidth = `calc(${leftWidth} - ${lineWidth} / 2 + ${overlap} / 2)`
    const finalRightWidth = `calc(100% - ${leftWidth} - ${lineWidth} / 2 + ${overlap} / 2)`
    const finalRightOffset = `calc(${leftWidth} + ${lineWidth} / 2 - ${overlap} / 2)`

    return (
        <section
            className={`page-hero relative w-full overflow-hidden md:h-100 ${className} `}
        >
            {/* Mobile: the angled split doesn't leave room for the content, so
             * stack the two panels as full-width blocks instead. */}
            <div className="flex flex-col md:hidden">
                <div className="relative h-56 w-full">{left}</div>
                <div className="relative h-44 w-full">{right}</div>
            </div>

            {/* Desktop: angled split with the two clipped panels. */}
            <div className="relative hidden h-full w-full md:block">
                <Clipper
                    className="h-full absolute"
                    side={'right'}
                    gradient={isGradientNegative ? 'negative' : 'positive'}
                    style={{ width: finalLeftWidth }}
                    overhang={overlap}
                >
                    {left}
                </Clipper>
                <Clipper
                    className="h-full absolute"
                    side={'left'}
                    gradient={isGradientNegative ? 'negative' : 'positive'}
                    style={{ width: finalRightWidth, left: finalRightOffset }}
                    overhang={overlap}
                >
                    {right}
                </Clipper>
            </div>
        </section>
    )
}
