/**
 * The browser summary tells postage apart by the shipping product's name, and
 * has nothing else to go on - so the name is an invariant this resolver keeps,
 * not a convention the dashboard is trusted with.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SHIPPING_LINE_ITEM_NAME } from '@/features/shop/checkout/utils/shippingLineItem'

const search = vi.fn()
const update = vi.fn()
const create = vi.fn()

vi.mock('../index.server', () => ({
    stripeAPI: {
        products: {
            search: (...args: unknown[]) => search(...args),
            update: (...args: unknown[]) => update(...args),
            create: (...args: unknown[]) => create(...args),
        },
    },
}))

/**
 * The resolver caches its answer in a module-level variable, so each case needs
 * a fresh copy of the module rather than just cleared mocks.
 */
async function freshResolver() {
    vi.resetModules()
    const module = await import('../shippingProduct.server')
    return module.resolveShippingProductId
}

beforeEach(() => {
    search.mockReset()
    update.mockReset().mockResolvedValue({})
    create.mockReset().mockResolvedValue({ id: 'prod_created' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('resolveShippingProductId', () => {
    it('leaves a correctly named product alone', async () => {
        search.mockResolvedValue({
            data: [{ id: 'prod_shipping', name: SHIPPING_LINE_ITEM_NAME }],
        })

        expect(await (await freshResolver())()).toBe('prod_shipping')
        expect(update).not.toHaveBeenCalled()
    })

    it('renames a product that drifted in the dashboard', async () => {
        search.mockResolvedValue({
            data: [{ id: 'prod_shipping', name: 'Postage & handling' }],
        })

        expect(await (await freshResolver())()).toBe('prod_shipping')
        expect(update).toHaveBeenCalledWith('prod_shipping', {
            name: SHIPPING_LINE_ITEM_NAME,
        })
    })

    it('creates one under the right name when there is none', async () => {
        search.mockResolvedValue({ data: [] })

        expect(await (await freshResolver())()).toBe('prod_created')
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ name: SHIPPING_LINE_ITEM_NAME }),
        )
    })

    it('only looks the product up once', async () => {
        search.mockResolvedValue({
            data: [{ id: 'prod_shipping', name: SHIPPING_LINE_ITEM_NAME }],
        })

        const resolve = await freshResolver()
        await resolve()
        await resolve()

        expect(search).toHaveBeenCalledTimes(1)
    })
})
