import type { ReactNode } from 'react'

/**
 * The checkout's two-column shell, `column-reverse` below 900px. In React because both
 * columns need one `CheckoutElementsProvider`, and context can't cross an island boundary.
 */
export default function CheckoutRow({ children }: { children: ReactNode }) {
    return (
        <div className="flex w-full flex-col-reverse gap-[50px] min-[900px]:flex-row min-[900px]:items-start">
            {children}
        </div>
    )
}
