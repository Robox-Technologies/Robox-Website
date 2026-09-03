import type { Appearance } from '@stripe/stripe-js'

/**
 * The look every Elements group in the checkout shares. A factory, not a constant:
 * two groups handed the same appearance object leaves the second mounted at 2px high.
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
            // Strips the accordion chrome Stripe wraps the single card option in.
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
