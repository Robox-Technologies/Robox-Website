//A generic component that can generate the slanted line clipping effect used in various parts of the site
interface ClipperProps {
    className: string;
    overhang?: number;
    children: React.ReactNode;
}
export default function Clipper({ className, overhang=20, children }: ClipperProps) {
    const clipPath = `polygon(0 0, 100% 0, calc(100% - ${overhang}px) 100%, 0 100%)`;
    return (
        <div className={`${className}`} style={{ clipPath }}>
            {children}
        </div>
    );
}