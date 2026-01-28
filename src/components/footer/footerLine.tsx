const lineOffset = "13px";

export default function FooterLine() {
    const style: React.CSSProperties = {"--line-offset": lineOffset} as React.CSSProperties;
    return (
        <hr
        style={style}
        className="relative w-11/12 mx-auto h-0.5 bg-black border-0
                    before:content-['']
                    before:absolute before:top-0 before:right-0
                    before:h-0.5
                    before:w-[calc(500px-var(--line-offset)-4.166vw)]
                    before:bg-white"
        />
    );
}