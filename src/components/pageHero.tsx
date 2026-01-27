import Clipper from "./Clipper";
interface PageHeroProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
    gradient?: 'positive' | 'negative';
    overlap?: string;
    lineWidth?: string;
}
const leftWidth = "33%";
const rightWidth = "67%";
export default function PageHero(props: PageHeroProps) {
    const { left, right, className, gradient = "positive", overlap="10vw", lineWidth = "10px" } = props;
    const isGradientNegative = gradient === 'negative';
    const sign = isGradientNegative ? 1 : -1;

    const finalLeftWidth  = `calc(${leftWidth} - ${lineWidth} / 2 + ${overlap} / 2)`;
    const finalRightWidth = `calc(${rightWidth} - ${lineWidth} / 2 + ${overlap} / 2)`;
    const finalRightOffset = `calc(${leftWidth} + ${lineWidth} / 2 - ${overlap} / 2)`;
    // TODO: Make this responsive
    return (
        <section className={`page-hero relative w-full h-80 overflow-hidden ${className} `}>
            <Clipper className="h-full absolute" side={"right"} gradient={isGradientNegative ? 'negative' : 'positive'} style={{ width: finalLeftWidth}} overhang={overlap}>
                {left}
            </Clipper>
            <Clipper className="h-full absolute" side={'left'} gradient={isGradientNegative ? 'negative' : 'positive'} style={{ width: finalRightWidth, left: finalRightOffset }} overhang={overlap}>
                {right}
            </Clipper>

        </section>
    )
}