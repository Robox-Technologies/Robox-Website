import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Image } from "astro:assets";
interface HeroProps {
    hero: ImageMetadata;
    children?: React.ReactNode;
    scrollIndicator?: boolean;   
}

export default function Hero({ hero, scrollIndicator = false, children }: HeroProps) {
    return (
        <section className="relative flex flex-col items-center h-screen bg-hero bg-cover bg-center text-center px-4">
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img className="h-full w-full object-cover" src={hero.src} alt="Hero Image" />
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