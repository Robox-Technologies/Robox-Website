import type { HTMLAttributes } from "react";

export default function Article({ children, className, ...props }: { children: React.ReactNode} & HTMLAttributes<HTMLElement>) {
    return <article className={`p-8 ${className || ''}`} {...props}>{children}</article>;   
}