import type { ReactNode } from 'react'

/**
 * The checkout's two-column shell: the active step beside the order summary,
 * collapsing to `column-reverse` below 900px so the summary leads on narrow
 * screens.
 *
 * Lives in React rather than in the page because the payment step has to wrap
 * both columns in one `CheckoutElementsProvider` - the summary reads its totals
 * from the session, and React context does not cross an island boundary.
 */
export default function CheckoutRow({ children }: { children: ReactNode }) {
    return (
        <div className="flex w-full flex-col-reverse gap-[50px] min-[900px]:flex-row min-[900px]:items-start">
            {children}
        </div>
    )
}
