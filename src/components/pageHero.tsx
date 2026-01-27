import Clipper from "./Clipper";
interface PageHeroProps {
    left: React.ReactNode;
    right: React.ReactNode;
    title: string;
    className?: string;
    gradient?: 'positive' | 'negative';
    overlap?: string;
    lineWidth?: string;
}
const leftWidth = "50%";
const rightWidth = "50%";
export default function PageHero({ left, right, title, className, gradient = "positive", overlap="10vw", lineWidth = "10px" }: PageHeroProps) {
    const isGradientNegative = gradient === 'negative';
    const sign = isGradientNegative ? 1 : -1;

    const finalLeftWidth  = `calc(${leftWidth} - ${lineWidth} / 2 + ${overlap} / 2)`;
    const finalRightWidth = `calc(${rightWidth} - ${lineWidth} / 2 + ${overlap} / 2)`;
    const finalRightOffset = `calc(${leftWidth} + ${lineWidth} / 2 - ${overlap} / 2)`;

    return (
        <section className={`page-hero relative w-full h-[60vh] min-h-[300px] overflow-hidden ${className} `}>
            <Clipper className="h-full absolute" side={"right"} gradient={isGradientNegative ? 'negative' : 'positive'} style={{ width: finalLeftWidth}} overhang={overlap}>
                <div className="bg-blue h-full w-full" >
                    {left}
                </div>
            </Clipper>
            <Clipper className="h-full absolute" side={'left'} gradient={isGradientNegative ? 'negative' : 'positive'} style={{ width: finalRightWidth, left: finalRightOffset }} overhang={overlap}>
                {right}
            </Clipper>

        </section>
    )
}