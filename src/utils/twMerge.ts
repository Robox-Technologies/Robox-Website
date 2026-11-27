import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, taught the `--radius-*` tokens in global.css, so a caller's
 * `rounded-full` replaces a component's `rounded-control` instead of both
 * landing in the class list. Import this rather than `tailwind-merge`.
 */
export const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            radius: ['surface', 'control', 'small'],
        },
    },
})
