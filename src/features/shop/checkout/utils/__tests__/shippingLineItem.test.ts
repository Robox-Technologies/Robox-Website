/** Misidentifying the postage line fails silently, so the cases are pinned here. */

import { describe, expect, it } from 'vitest'
import type { Stripe } from 'stripe'

import {
    SHIPPING_LINE_ITEM_NAME,
    SHIPPING_PRODUCT_MARKER,
    isShippingLine,
    isShippingLineName,
} from '../shippingLineItem'

const SHIPPING_PRODUCT_ID = 'prod_shipping'

/** A line whose product came back expanded, as the webhook now asks for. */
function expandedLine(product: Record<string, unknown>): Stripe.LineItem {
    return {
        price: { product: product as unknown as Stripe.Product },
    } as Stripe.LineItem
}

/** A line whose product came back as a bare id, i.e. it wasn't expanded. */
function collapsedLine(productId: string): Stripe.LineItem {
    return { price: { product: productId } } as Stripe.LineItem
}

const POSTAGE = expandedLine({
    id: SHIPPING_PRODUCT_ID,
    metadata: {
        [SHIPPING_PRODUCT_MARKER.key]: SHIPPING_PRODUCT_MARKER.value,
    },
})

const KIT = expandedLine({ id: 'prod_kit', metadata: {} })

describe('isShippingLine', () => {
    it('knows postage by its marker metadata', () => {
        expect(isShippingLine(POSTAGE, null)).toBe(true)
        expect(isShippingLine(KIT, null)).toBe(false)
    })

    it('ignores the display name, so renaming the product is safe', () => {
        const renamed = expandedLine({
            id: SHIPPING_PRODUCT_ID,
            name: 'Postage and handling',
            metadata: {
                [SHIPPING_PRODUCT_MARKER.key]: SHIPPING_PRODUCT_MARKER.value,
            },
        })

        expect(isShippingLine(renamed, null)).toBe(true)
    })

    it('falls back to the product id when the product was not expanded', () => {
        expect(
            isShippingLine(
                collapsedLine(SHIPPING_PRODUCT_ID),
                SHIPPING_PRODUCT_ID,
            ),
        ).toBe(true)
        expect(
            isShippingLine(collapsedLine('prod_kit'), SHIPPING_PRODUCT_ID),
        ).toBe(false)
    })

    it('will not call an unexpanded line postage with no id to match on', () => {
        expect(isShippingLine(collapsedLine(SHIPPING_PRODUCT_ID), null)).toBe(
            false,
        )
    })

    it('handles a deleted product and a line with no price', () => {
        const deleted = expandedLine({
            id: SHIPPING_PRODUCT_ID,
            deleted: true,
        })

        expect(isShippingLine(deleted, SHIPPING_PRODUCT_ID)).toBe(false)
        expect(isShippingLine({} as Stripe.LineItem, SHIPPING_PRODUCT_ID)).toBe(
            false,
        )
    })
})

/** The browser's only handle on the postage line, since the client session carries no product. */
describe('isShippingLineName', () => {
    it('matches the name the shipping product is held at', () => {
        expect(isShippingLineName(SHIPPING_LINE_ITEM_NAME)).toBe(true)
    })

    it('matches nothing else, including a near miss', () => {
        expect(isShippingLineName('Ro/Box')).toBe(false)
        expect(isShippingLineName('shipping')).toBe(false)
        expect(isShippingLineName('Shipping ')).toBe(false)
        expect(isShippingLineName('Postage and packaging')).toBe(false)
        expect(isShippingLineName(null)).toBe(false)
        expect(isShippingLineName(undefined)).toBe(false)
    })
})
