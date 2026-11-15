import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DROPOUT_GRACE_MS, GamepadInput } from '../drive/inputs/gamepad'

/** x is the right stick's horizontal axis, y the left stick's vertical one. */
function pad(id: string, x: number, y: number, mapping = 'standard'): Gamepad {
    return {
        id,
        connected: true,
        mapping,
        axes: [0, y, x, 0],
    } as unknown as Gamepad
}

let pads: (Gamepad | null)[] = []
let time = 0

beforeEach(() => {
    pads = []
    time = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => time)
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('GamepadInput', () => {
    it('holds the last reading through a brief drop-out', () => {
        const input = new GamepadInput(() => pads)
        pads = [pad('DualSense', 0, -1)]
        expect(input.read()).toEqual({ x: 0, y: 1 })

        pads = []
        time += DROPOUT_GRACE_MS - 50
        expect(input.read()).toEqual({ x: 0, y: 1 })
        expect(input.isEngaged()).toBe(true)
        expect(input.connectedName()).toBe('DualSense')

        pads = [pad('DualSense', 0, -1)]
        time += 16
        expect(input.read()).toEqual({ x: 0, y: 1 })
    })

    it('lets go once the pad stays gone', () => {
        const input = new GamepadInput(() => pads)
        pads = [pad('DualSense', 0, -1)]
        input.read()

        pads = []
        time += DROPOUT_GRACE_MS + 1
        expect(input.read()).toEqual({ x: 0, y: 0 })
        expect(input.isEngaged()).toBe(false)
        expect(input.connectedName()).toBeNull()
    })

    it('sticks with the same pad when it comes back in another slot', () => {
        const input = new GamepadInput(() => pads)
        pads = [pad('DualSense', 0.5, 0)]
        input.read()

        pads = [pad('Other', -1, 0), pad('DualSense', 0.5, 0)]
        expect(input.read()).toEqual({ x: 0.5, y: -0 })
    })

    it('throttles on the left stick and steers on the right', () => {
        const input = new GamepadInput(() => pads)
        // Left stick pushed right, right stick pushed down: neither counts.
        pads = [
            {
                id: 'DualSense',
                connected: true,
                mapping: 'standard',
                axes: [1, -0.8, 0.4, 1],
            } as unknown as Gamepad,
        ]
        expect(input.read()).toEqual({ x: 0.4, y: 0.8 })
    })

    it('prefers a standard-mapped pad', () => {
        const input = new GamepadInput(() => pads)
        pads = [null, pad('Raw HID', 1, 0, ''), pad('DualSense', -1, 0)]
        expect(input.read().x).toBe(-1)
    })
})
