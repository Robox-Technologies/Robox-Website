import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
interface HeroProps {
    hero: ImageMetadata;
    children?: React.ReactNode;
    scrollIndicator?: boolean;   
    imageClassName?: string;
}

export default function Hero({ hero, scrollIndicator = false, children, imageClassName, className, ...props }: HeroProps & HTMLAttributes<HTMLDivElement>) {
    return (
        <section className={twMerge("relative flex flex-col items-center h-screen bg-hero bg-cover bg-center text-center px-4", className)} {...props}>
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img className={twMerge("h-full w-full object-cover", imageClassName)} src={hero.src} alt="Hero Image" />
            </div>
            {children}
            {scrollIndicator && <ScrollIndicator />}

        </section>
    )
}
function ScrollIndicator() {
    return (
        <div className="absolute bottom-10 w-full flex justify-center hover:cursor-pointer">
            <button onClick={scrollToContent} aria-label="Scroll to content" className="animate-bounce mt-8 flex flex-col items-center gap-2">
                <FontAwesomeIcon icon={faChevronDown} className="h-6 w-6 text-white" />
            </button>
        </div>
    )
}
function scrollToContent() {
    const content = document.getElementById('content');
    if (content) {
        content.scrollIntoView({ behavior: 'smooth' });
    }
}