import { WorkspaceSvg } from "blockly";
const scrollSpeed = 1.1; // Adjust for sensitivity

export function registerControls(workspace: WorkspaceSvg) {
    const toolbox = document.querySelector(".blocklyToolbox")
    document.addEventListener('wheel', (event: WheelEvent) => {
        if (document.querySelector('dialog[open]')) return;
        event.preventDefault();
        
        const dy = event.deltaY * scrollSpeed;
        if (event.target instanceof HTMLElement && event.target.closest(".blocklyToolbox")) {
            // You can handle wheel event inside toolbox here
            // For example, programmatically scroll the toolbox:
            if (toolbox) {
                // Scroll the toolbox vertically by dy pixels
                toolbox.scrollTop += dy;
            }
            return
        }
        
        const dx = event.deltaX * scrollSpeed;

        workspace.scrollX -= dx
        workspace.scrollY -= dy
        
        workspace.render()
    }, { passive: false });
}