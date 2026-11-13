import { describe, expect, it } from 'vitest'

import { applyDeadzone, arcadeMix, toMotorSpeeds } from '../drive/mixer'

const LINEAR = { maxSpeed: 1, expo: 0, deadzone: 0 }

describe('arcadeMix', () => {
    it('drives both wheels forward on a straight push', () => {
        expect(arcadeMix({ x: 0, y: 1 })).toEqual({ left: 1, right: 1 })
    })

    it('pivots on a pure sideways push', () => {
        expect(arcadeMix({ x: 1, y: 0 })).toEqual({ left: 1, right: -1 })
    })

    it('keeps the turn ratio when a corner would saturate', () => {
        const { left, right } = arcadeMix({ x: 1, y: 1 })
        expect(left).toBe(1)
        expect(right).toBe(0)
    })
})

describe('applyDeadzone', () => {
    it('zeroes inside and rescales outside, without a jump', () => {
        expect(applyDeadzone(0.05, 0.1)).toBe(0)
        expect(applyDeadzone(0.1001, 0.1)).toBeCloseTo(0, 2)
        expect(applyDeadzone(-1, 0.1)).toBe(-1)
    })
})

describe('toMotorSpeeds', () => {
    it('scales to the max speed', () => {
        expect(
            toMotorSpeeds({ x: 0, y: 1 }, { ...LINEAR, maxSpeed: 0.5 }),
        ).toEqual({
            left: 50,
            right: 50,
        })
    })

    it('reverses', () => {
        expect(toMotorSpeeds({ x: 0, y: -1 }, LINEAR)).toEqual({
            left: -100,
            right: -100,
        })
    })

    it('rests at zero inside the deadzone, never -0', () => {
        const speeds = toMotorSpeeds({ x: -0.02, y: -0.03 })
        expect(Object.is(speeds.left, 0)).toBe(true)
        expect(Object.is(speeds.right, 0)).toBe(true)
    })

    it('treats garbage input as centred', () => {
        expect(toMotorSpeeds({ x: NaN, y: Infinity }, LINEAR)).toEqual({
            left: 0,
            right: 0,
        })
    })
})
