import * as Blockly from 'blockly';

import archSVG from './Arch.svg?raw';

import { ContinuousFlyout, ContinuousMetrics, ContinuousToolbox, RecyclableBlockFlyoutInflater } from '@blockly/continuous-toolbox';

type HexColor = `#${string}`;

class RoboxToolboxCategories extends Blockly.ToolboxCategory {
    /**
     * Constructor for a custom category.
     * @override
     */
    constructor(categoryDef: Blockly.utils.toolbox.CategoryInfo, toolbox: Blockly.Toolbox, opt_parent: Blockly.ICollapsibleToolboxItem) {
        super(categoryDef, toolbox, opt_parent);
    }
    /** @override */
    addColourBorder_(colour: HexColor){

    }
    /** @override */
    createRowContentsContainer_() {
        const dom = super.createRowContentsContainer_();
        const rectangle = document.createElement("div")
        rectangle.className = "extender"
        rectangle.style.background = this.colour_
        const container = document.createElement("div")
        container.className = "side-arch"
        container.innerHTML = archSVG
        const arch = container.querySelector("svg > path")
        if (!arch || !(arch instanceof SVGElement)) return dom
        arch.style.fill = this.colour_;
        arch.style.stroke = this.colour_;
        dom.appendChild(rectangle)
        dom.appendChild(container)
        return dom
    }
    /** @override */
    createLabelDom_(name: string) {
        const label = super.createLabelDom_(name);
        if (!label || !(label instanceof HTMLElement)) return label
        label.style.color = this.colour_
        return label
    }
    /** @override */
    setSelected(isSelected: boolean){
        const dom = this.htmlDiv_
        const icon = dom?.querySelector(".categoryIcon")
        const extender = dom?.querySelector(".extender")
        if (!icon || !(icon instanceof SVGElement)) return
        if (!extender || !(extender instanceof HTMLElement)) return
        if (isSelected) {
            icon.style.marginLeft = "20px";
            extender.classList.add("extended")
        } else {
            icon.style.marginLeft = "0px";
            extender.classList.remove("extended")
        }
    }
}
class RoboxToolboxSeperator extends Blockly.ToolboxSeparator {
    constructor(seperatorDef: Blockly.utils.toolbox.SeparatorInfo, toolbox: Blockly.Toolbox) {
        super(seperatorDef, toolbox);
    }
    createDom_(): HTMLDivElement {
        const dom = super.createDom_();
        const seperator = document.createElement("div")
        seperator.className = "seperator"
        dom.appendChild(seperator)
        return dom
    }
}


//Overriding the flyoutscale value (to prevent it scaliing with the workspace)


class RoboxFlyout extends ContinuousFlyout {

    /** @override */
    protected reflowInternal_(): void {
        this.width_ = 300;
        this.targetWorkspace.recordDragTargets()
    }
    override scrollTo(position: number) {
        const OFFSET = 5; // pixels
        const adjustedPosition = position + OFFSET;

        const metrics = this.getWorkspace().getMetrics();
        const scrollTarget = Math.min(
            adjustedPosition,
            metrics.scrollHeight - metrics.viewHeight,
        );

        this.getWorkspace().scrollbar?.setY(scrollTarget);
    }
}






Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    RoboxToolboxCategories, true
);
Blockly.registry.register(
    Blockly.registry.Type.FLYOUT_INFLATER,
    'block',
    RecyclableBlockFlyoutInflater,
    true,
);
Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxSeparator.registrationName,
    RoboxToolboxSeperator, true
);
Blockly.registry.register(
    Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
    'RoboxFlyout',
    RoboxFlyout, true
);
