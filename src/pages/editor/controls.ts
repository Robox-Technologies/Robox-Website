import { utils, WorkspaceSvg } from "blockly";
const scrollSpeed = 1.1; // Adjust for sensitivity
const zoomFac = 0.02;
const zoomStep = 0.7;

function stepZoom(workspace: WorkspaceSvg, mult: number) {
    const workspaceCoordinates = workspace.getMetricsManager().getViewMetrics(false);
    const toolboxCoordinates = workspace.getMetricsManager().getToolboxMetrics();
    const flyoutCoordinates = workspace.getMetricsManager().getFlyoutMetrics();
    
    const centreX = (workspaceCoordinates.width / 2) + toolboxCoordinates.width + flyoutCoordinates.width;
    const centreY = workspaceCoordinates.height / 2;

    workspace.zoom(centreX, centreY, zoomStep * mult);
}

export function registerControls(workspace: WorkspaceSvg) {
    const undoButton = document.getElementById("undo");
    if (undoButton) {
        undoButton.addEventListener("click", () => {
            workspace.undo(false);
        });
    }

    const redoButton = document.getElementById("redo");
    if (redoButton) {
        redoButton.addEventListener("click", () => {
            workspace.undo(true);
        });
    }

    const zoomInButton = document.getElementById("zoomIn");
    if (zoomInButton) {
        zoomInButton.addEventListener("click", () => {
            stepZoom(workspace, 1);
        });
    }

    const zoomOutButton = document.getElementById("zoomOut");
    if (zoomOutButton) {
        zoomOutButton.addEventListener("click", () => {
            stepZoom(workspace, -1);
        });
    }

    document.addEventListener('wheel', (event: WheelEvent) => {
        if (!(event.target instanceof Element)) return;
        if (document.querySelector('dialog[open]') || !event.target.closest("#blocklyDiv")) return;
        if (event.target.closest(".blocklyFlyoutScrollbar") || event.target.closest(".blocklyFlyout") || event.target.closest(".blocklyToolbox")) return;

        // Workspace interaction - prevent window scrolling
        event.preventDefault();

        if (event.ctrlKey) {
            // Zoom override
            const mouseSvgCoords = utils.browserEvents.mouseToSvg(event, workspace.getParentSvg(), workspace.getInverseScreenCTM());
            workspace.zoom(mouseSvgCoords.x, mouseSvgCoords.y, -event.deltaY * zoomFac);
            
            return;
        }
        
        let dx = event.deltaX * scrollSpeed;
        let dy = event.deltaY * scrollSpeed;

        if (dx === 0 && dy !== 0 && event.shiftKey) {
            // Purely vertical scroll with shift key -> horizontal scroll instead
            dx = dy;
            dy = 0;
        }

        workspace.scroll(workspace.scrollX - dx, workspace.scrollY - dy);
        workspace.render();
    }, { passive: false });
}