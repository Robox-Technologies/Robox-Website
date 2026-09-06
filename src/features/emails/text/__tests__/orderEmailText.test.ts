/** Pins the internal notice's contents and the `[TEST]` marker. */

import { describe, expect, it } from 'vitest'

import {
    buildInternalOrderSubject,
    buildInternalOrderText,
    type InternalOrderTextData,
} from '../orderEmailText'

function orderData(
    overrides: Partial<InternalOrderTextData> = {},
): InternalOrderTextData {
    return {
        to: 'ada@example.com',
        name: 'Ada Lovelace',
        date: '23 June 2026',
        orderId: 'pi_123',
        items: [
            { name: 'Ro/Box Starter Kit', quantity: 1, subtotal: 'AU$129.00' },
        ],
        shipping: 'AU$9.95',
        shippingMethod: 'Express shipping',
        total: 'AU$138.95',
        address: '42 Analytical Engine Way\nMelbourne VIC 3000\nAustralia',
        billing: 'Visa\nEnding in ••••4242',
        packing: {
            description: '1 large satchel',
            parcels: [
                {
                    label: 'large satchel',
                    contents: '1x Ro/Box Starter Kit',
                    dimensions: '48.5x36x5cm',
                    weight: '500g',
                },
            ],
            totalWeight: '500g',
            unlistedParcels: 0,
        },
        testMode: false,
        ...overrides,
    }
}

describe('buildInternalOrderSubject', () => {
    it('names the customer and the order', () => {
        expect(buildInternalOrderSubject(orderData())).toBe(
            'New order - Ada Lovelace (pi_123)',
        )
    })

    it('marks a sandbox payment', () => {
        expect(buildInternalOrderSubject(orderData({ testMode: true }))).toBe(
            '[TEST] New order - Ada Lovelace (pi_123)',
        )
    })
})

describe('buildInternalOrderText', () => {
    it('carries everything the order is packed and posted from', () => {
        const text = buildInternalOrderText(orderData())

        expect(text).toContain('Customer: Ada Lovelace')
        expect(text).toContain('Email: ada@example.com')
        expect(text).toContain('Shipping: Express shipping')
        expect(text).toContain('42 Analytical Engine Way')
        expect(text).toContain(
            '1. large satchel: 1x Ro/Box Starter Kit - 48.5x36x5cm, 500g',
        )
        expect(text).toContain('Total weight: 500g')
        expect(text).toContain('Ro/Box Starter Kit × 1: AU$129.00')
        expect(text).toContain('Total: AU$138.95')
    })

    it('leads with the sandbox warning on a test order', () => {
        expect(buildInternalOrderText(orderData({ testMode: true }))).toMatch(
            /^\[TEST\] Sandbox payment/,
        )
        expect(buildInternalOrderText(orderData())).not.toContain('[TEST]')
    })

    it('says so when no service was recorded', () => {
        expect(
            buildInternalOrderText(orderData({ shippingMethod: undefined })),
        ).toContain('Shipping: Not recorded')
    })

    it('asks for the order to be packed by hand when no plan was recorded', () => {
        expect(buildInternalOrderText(orderData({ packing: null }))).toContain(
            'No packing plan was recorded',
        )
    })

    it('flags the parcels the metadata had no room for', () => {
        const data = orderData()
        const text = buildInternalOrderText(
            orderData({ packing: { ...data.packing!, unlistedParcels: 3 } }),
        )

        expect(text).toContain('+ 3 further parcels not listed')
    })
})
