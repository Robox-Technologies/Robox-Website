/**
 * Googly-eye tracking: every `.eyes` overlay leans towards the pointer. The transform is
 * written inline, so an `.eyes` element must be positioned with insets only.
 */

/** Peak offset, as a percentage of the overlay's own size. */
const EYE_MAX_DIST = 5
const MOBILE_DIST_MULT = 2
/** Distance in px over which the offset ramps up to (half of) its peak. */
const FALLOFF_FAC = 200

interface Point {
    x: number
    y: number
}

export function initEyes(): void {
    /* Live collection: eyes that arrive later (a hydrated island, say) are
       picked up without re-running any of this. */
    const eyes = document.getElementsByClassName(
        'eyes',
    ) as HTMLCollectionOf<HTMLElement>

    /** Where the eyes are looking, or `undefined` for straight ahead. */
    let target: Point | undefined
    /** Latched forever on first touch: iOS follows a tap with a synthetic `mousemove`. */
    let touchInput = false

    function render() {
        for (const eye of eyes) {
            const rect = eye.getBoundingClientRect()

            /* Nobody can watch an offscreen eye move, and it gets a fresh
               transform from the scroll handler on the way back in. */
            if (rect.top > window.innerHeight || rect.bottom < 0) continue

            const delta = target && {
                x: target.x - (rect.x + rect.width / 2),
                y: target.y - (rect.y + rect.height / 2),
            }
            const dist = delta ? Math.sqrt(delta.x ** 2 + delta.y ** 2) : 0

            if (!delta || dist === 0) {
                eye.style.transform = ''
                continue
            }

            const offset =
                (EYE_MAX_DIST - FALLOFF_FAC / (dist + FALLOFF_FAC / EYE_MAX_DIST)) * (touchInput ? MOBILE_DIST_MULT : 1)

            eye.style.transform = `translate(${(delta.x / dist) * offset}%,${(delta.y / dist) * offset}%)`
        }
    }

    function look(point: Point) {
        target = point
        render()
    }

    function release() {
        target = undefined
        render()
    }

    /* `touchstart`/`touchmove` aim the eyes, `touchend`/`touchcancel` release
       them — but only once the last finger is up, so lifting one of two doesn't
       cut a gesture short. */
    function onTouch(event: TouchEvent) {
        if (!touchInput) {
            touchInput = true
            document.documentElement.classList.add('eyes-touch')
        }

        const touch = event.touches[0]
        if (touch) look({ x: touch.clientX, y: touch.clientY })
        else release()
    }

    const passive = { passive: true } as const
    for (const type of [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel',
    ] as const) {
        document.addEventListener(type, onTouch, passive)
    }

    document.addEventListener(
        'mousemove',
        (event) => {
            if (touchInput) return
            look({ x: event.clientX, y: event.clientY })
        },
        passive,
    )

    /* The eyes are aimed in viewport coordinates, so a scroll moves them
       relative to a pointer that hasn't itself moved. */
    document.addEventListener('scroll', render, passive)
}
