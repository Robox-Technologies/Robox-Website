import { WorkspaceSvg } from "blockly";
const scrollSpeed = 1.1; // Adjust for sensitivity

export function registerControls(workspace: WorkspaceSvg) {
    const toolbox = document.querySelector(".blocklyToolbox")
    document.addEventListener('wheel', (event: WheelEvent) => {
        if (document.querySelector('dialog[open]')) return;
        event.preventDefault();
        
        let dx = event.deltaX * scrollSpeed;
        let dy = event.deltaY * scrollSpeed;
        
        if (dx === 0 && dy !== 0 && event.shiftKey) {
            // Purely vertical scroll with shift key -> horizontal scroll instead
            dx = dy;
            dy = 0;
        }

        if (event.target instanceof HTMLElement && event.target.closest(".blocklyToolbox")) {
            // You can handle wheel event inside toolbox here
            // For example, programmatically scroll the toolbox:
            if (toolbox) {
                // Scroll the toolbox vertically by dy pixels
                toolbox.scrollTop += dy;
            }
            return;
        }

        workspace.scroll(workspace.scrollX - dx, workspace.scrollY - dy);
        workspace.render();
    }, { passive: false });
}