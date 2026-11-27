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

    // Mobile keeps the desktop's slant, turned onto the horizontal seam: the
    // lower panel is cut on a diagonal and inset by a thin stroke. It inherits
    // the section's background (the divider colour) so the stroke paints that
    // colour over the top panel, not whatever is behind it.
    const slant = '24px'
    const stroke = '6px'
    const seamClip = isGradientNegative
        ? `polygon(0 0, 100% ${slant}, 100% 100%, 0 100%)`
        : `polygon(0 ${slant}, 100% 0, 100% 100%, 0 100%)`
    const panelClip = isGradientNegative
        ? `polygon(0 ${stroke}, 100% calc(${slant} + ${stroke}), 100% 100%, 0 100%)`
        : `polygon(0 calc(${slant} + ${stroke}), 100% ${stroke}, 100% 100%, 0 100%)`

    return (
        <section
            className={`page-hero relative w-full overflow-hidden md:h-100 ${className} `}
        >
            {/* Mobile: the angled split doesn't leave room for the content, so
             * stack the panels: the top one fits its title, the lower one
             * tucks up under it on the slant. */}
            <div className="flex flex-col bg-inherit md:hidden">
                <div className="relative w-full">{left}</div>
                <div
                    className="relative -mt-6 h-56 w-full bg-inherit"
                    style={{ clipPath: seamClip }}
                >
                    <div
                        className="absolute inset-0"
                        style={{ clipPath: panelClip }}
                    >
                        {right}
                    </div>
                </div>
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
