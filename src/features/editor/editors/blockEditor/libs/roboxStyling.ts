import * as Blockly from 'blockly/core'

import archSVG from '../assets/Arch.svg?raw'

import {
    ContinuousFlyout,
    RecyclableBlockFlyoutInflater,
    ContinuousToolbox,
} from '@blockly/continuous-toolbox'

export class RoboxToolbox extends ContinuousToolbox {
    // Random deselects when you click the same category again
    override shouldDeselectItem_(
        oldItem: Blockly.ISelectableToolboxItem | null,
        newItem: Blockly.ISelectableToolboxItem | null,
    ): boolean {
        return oldItem !== null && newItem !== null && oldItem !== newItem
    }
}
class RoboxToolboxCategories extends Blockly.ToolboxCategory {
    /**
     * Constructor for a custom category.
     * @override
     */
    constructor(
        categoryDef: Blockly.utils.toolbox.CategoryInfo,
        toolbox: Blockly.Toolbox,
        opt_parent: Blockly.ICollapsibleToolboxItem,
    ) {
        super(categoryDef, toolbox, opt_parent)
    }
    /** @override */
    createRowContentsContainer_() {
        const dom = super.createRowContentsContainer_()
        const rectangle = document.createElement('div')
        rectangle.className = 'extender'
        rectangle.style.background = this.colour_
        const container = document.createElement('div')
        container.className = 'side-arch'
        container.innerHTML = archSVG
        const arch = container.querySelector('svg > path')
        if (!arch || !(arch instanceof SVGElement)) return dom
        arch.style.fill = this.colour_
        arch.style.stroke = this.colour_
        dom.appendChild(rectangle)
        dom.appendChild(container)
        return dom
    }
    /** @override */
    createLabelDom_(name: string) {
        const label = super.createLabelDom_(name)
        if (!label || !(label instanceof HTMLElement)) return label
        label.style.color = this.colour_
        return label
    }
    /** @override */
    setSelected(isSelected: boolean) {
        const dom = this.htmlDiv_
        const icon = dom?.querySelector('.categoryIcon')
        const extender = dom?.querySelector('.extender')
        if (!icon || !(icon instanceof SVGElement)) return
        if (!extender || !(extender instanceof HTMLElement)) return
        if (isSelected) {
            icon.style.marginLeft = '20px'
            extender.classList.add('extended')
        } else {
            icon.style.marginLeft = '0px'
            extender.classList.remove('extended')
        }
    }
}
class RoboxToolboxSeperator extends Blockly.ToolboxSeparator {
    constructor(
        seperatorDef: Blockly.utils.toolbox.SeparatorInfo,
        toolbox: Blockly.Toolbox,
    ) {
        super(seperatorDef, toolbox)
    }
    createDom_(): HTMLDivElement {
        const dom = super.createDom_()
        const seperator = document.createElement('div')
        seperator.className = 'seperator'
        dom.appendChild(seperator)
        return dom
    }
}

const FLYOUT_WIDTH = 300
// Breathing room around a peeking block, enough for its drop shadow.
const PEEK_PADDING = 8
const PEEK_CLASS = 'flyout-peek'

//Overriding the flyoutscale value (to prevent it scaliing with the workspace)

export class RoboxFlyout extends ContinuousFlyout {
    private peeked: SVGGElement | null = null

    /** @override */
    protected reflowInternal_(): void {
        this.width_ = FLYOUT_WIDTH
        this.targetWorkspace.recordDragTargets()
    }

    override init(targetWorkspace: Blockly.WorkspaceSvg) {
        super.init(targetWorkspace)
        this.svgGroup_?.addEventListener('pointerover', this.onPointerOver)
        this.svgGroup_?.addEventListener('pointerleave', this.clearPeek)
    }

    /** Keeps the notch aligned with its block while the flyout scrolls. */
    protected override setMetrics_(xyRatio: { x: number; y: number }) {
        super.setMetrics_(xyRatio)
        this.updatePeek()
    }

    override hide() {
        this.clearPeek()
        super.hide()
    }

    override dispose() {
        this.svgGroup_?.removeEventListener('pointerover', this.onPointerOver)
        this.svgGroup_?.removeEventListener('pointerleave', this.clearPeek)
        super.dispose()
    }

    private readonly onPointerOver = (event: PointerEvent) => {
        // Climb to the flyout item the pointer is in, past fields and inputs.
        const canvas = this.getWorkspace().getCanvas()
        let node = event.target instanceof Element ? event.target : null
        while (node && node.parentNode !== canvas) node = node.parentElement
        this.peeked = node instanceof SVGGElement ? node : null
        this.updatePeek()
    }

    private readonly clearPeek = () => {
        this.peeked = null
        this.updatePeek()
    }

    /**
     * Cuts a notch out of the flyout's right edge so a block too long to fit
     * spills over the workspace instead of being clipped.
     */
    private updatePeek() {
        const root = this.svgGroup_
        if (!root) return
        if (!this.peeked && !root.style.clipPath) return
        root.querySelector(`.${PEEK_CLASS}`)?.classList.remove(PEEK_CLASS)

        const flyout = root.getBoundingClientRect()
        const block = this.peeked?.isConnected ? this.peeked : null
        const rect = block?.getBoundingClientRect()
        const right = rect ? rect.right - flyout.left + PEEK_PADDING : 0
        if (!block || !rect || right <= flyout.width) {
            root.style.removeProperty('overflow')
            root.style.removeProperty('clip-path')
            return
        }

        const top = Math.max(0, rect.top - flyout.top - PEEK_PADDING)
        const bottom = Math.min(
            flyout.height,
            rect.bottom - flyout.top + PEEK_PADDING,
        )
        const edge = `${flyout.width}px`
        block.classList.add(PEEK_CLASS)
        root.style.overflow = 'visible'
        root.style.clipPath =
            `polygon(0 0, ${edge} 0, ${edge} ${top}px, ${right}px ${top}px, ` +
            `${right}px ${bottom}px, ${edge} ${bottom}px, ` +
            `${edge} ${flyout.height}px, 0 ${flyout.height}px)`
    }

    override scrollTo(position: number) {
        const OFFSET = 5 // pixels
        const scale = this.getWorkspace().scale || 1
        const adjustedPosition = (position + OFFSET) * scale

        const metrics = this.getWorkspace().getMetrics()
        const scrollTarget = Math.min(
            adjustedPosition,
            metrics.scrollHeight - metrics.viewHeight,
        )

        this.getWorkspace().scrollbar?.setY(scrollTarget)
    }
}

Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    RoboxToolboxCategories,
    true,
)
Blockly.registry.register(
    Blockly.registry.Type.FLYOUT_INFLATER,
    'block',
    RecyclableBlockFlyoutInflater,
    true,
)
Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxSeparator.registrationName,
    RoboxToolboxSeperator,
    true,
)
