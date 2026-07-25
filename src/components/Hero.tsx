import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'
interface HeroProps {
    hero: string,
    /** Optional portrait/mobile crop shown below the `lg` breakpoint. */
    heroMobile?: string
    children?: React.ReactNode
    scrollIndicator?: boolean
    imageClassName?: string
}

export default function Hero({
    hero,
    heroMobile,
    scrollIndicator = false,
    children,
    imageClassName,
    className,
    ...props
}: HeroProps & HTMLAttributes<HTMLDivElement>) {
    return (
        <section
            className={twMerge(
                `relative flex flex-col items-center h-[calc(100vh-74px)] bg-hero bg-cover bg-center text-center px-4`,
                className,
            )}
            {...props}
        >
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                {heroMobile && (
                    <img
                        className="h-full w-full object-cover object-center lg:hidden"
                        src={heroMobile}
                        alt=""
                        fetchPriority="high"
                    />
                )}
                <img
                    className={twMerge(
                        'h-full w-full object-cover',
                        heroMobile && 'max-lg:hidden',
                        imageClassName,
                    )}
                    src={hero}
                    alt="Hero Image"
                    fetchPriority="high"
                />
            </div>
            {children}
            {scrollIndicator && <ScrollIndicator />}
        </section>
    )
}
/**
 * A plain anchor rather than a click handler: the hero renders as static HTML
 * with no island, so an onClick never fired. Smooth scrolling comes from
 * `scroll-behavior` in global.css, and `#content` gets scroll-margin for the
 * sticky header.
 */
function ScrollIndicator() {
    return (
        // Centring lives on the wrapper because `animate-bounce` owns the
        // anchor's transform.
        <div className="absolute bottom-4 flex w-full justify-center">
            <a
                href="#content"
                aria-label="Scroll to content"
                className="animate-bounce flex h-11 w-11 items-center justify-center rounded-full bg-black/90 text-primary hover:cursor-pointer"
            >
                <FontAwesomeIcon icon={faChevronDown} className="h-6 w-6" />
            </a>
        </div>
    )
}
