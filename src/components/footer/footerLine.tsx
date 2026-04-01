const lineOffset = '0.5vw'

export default function FooterLine() {
    const style: React.CSSProperties = {
        '--line-offset': lineOffset,
    } as React.CSSProperties
    return (
        <hr
            style={style}
            className="relative w-11/12 mx-auto p-px bg-black border-0
                    before:content-['']
                    before:absolute before:top-0 before:right-0
                    before:p-px before:h-full
                    before:w-[calc(25vw-var(--line-offset)-4.166vw)]
                    before:bg-white"
        />
    )
}
