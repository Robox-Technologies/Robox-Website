//A generic component that can generate the slanted line clipping effect used in various parts of the site
export default function Clipper(angle: number, children: React.ReactNode) {
    const clipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${Math.tan(angle * Math.PI / 180) * 100}%), 0 100%)`;
    return (
        <div style={{ clipPath }}>
            {children}
        </div>
    );
}