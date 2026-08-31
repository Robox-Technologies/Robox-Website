import type { Appearance } from '@stripe/stripe-js'

/**
 * The look every Elements group in the checkout shares - the address step and
 * the payment step mount separate groups, and a difference between them would
 * read as two different forms rather than two steps of one.
 *
 * A factory rather than a shared constant. Handing the *same* appearance object
 * to two Elements groups left the second group's elements mounted at 2px high,
 * never firing `ready`, so the payment form sat invisible behind its spinner
 * forever. Each group gets its own object.
 */
export function createCheckoutAppearance(): Appearance {
    return {
        theme: 'stripe',
        variables: {
            colorPrimaryText: '#262626',
            colorText: '#0f172a',
            colorPrimary: '#2563eb',
            fontFamily:
                'Nunito, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            fontSizeBase: '16px',
        },
        rules: {
            // Only card is offered, so Stripe still wraps it in an accordion
            // item — strip the card chrome so it sits flat on the page like the
            // elements above it.
            '.AccordionItem': {
                border: 'none',
                backgroundColor: 'transparent',
                boxShadow: 'none',
                paddingTop: '0',
                paddingRight: '0',
                paddingBottom: '0',
                paddingLeft: '0',
            },
            '.AccordionItem--selected': {
                backgroundColor: 'transparent',
                boxShadow: 'none',
            },
            '.Input': {
                backgroundColor: '#fff',
            },
        },
    }
}
