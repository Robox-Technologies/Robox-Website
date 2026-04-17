import type { WorkspaceSvg } from 'blockly'
import { utils } from 'blockly'
import * as Blockly from 'blockly'
const scrollSpeed = 1.1 // Adjust for sensitivity
const zoomFac = 0.02

export function registerControls(workspace: WorkspaceSvg) {
    let averageTouch = {
        clientX: 0,
        clientY: 0,
        current: false
    };

    document.addEventListener('touchmove', (e) => {
        const touches = e.targetTouches; // or e.touches
        if (touches.length === 0) return;
      
        let totalX = 0;
        let totalY = 0;
      
        for (let i = 0; i < touches.length; i++) {
          totalX += touches[i].clientX;
          totalY += touches[i].clientY;
        }
      
        averageTouch = {
            clientX: totalX / touches.length,
            clientY: totalY / touches.length,
            current: true
        };
    });

    document.addEventListener(
        'wheel',
        (event: WheelEvent) => {
            if (!(event.target instanceof Element)) return;
            if (
                document.querySelector('dialog[open]') ||
                !event.target.closest('#blocklyDiv')
            ) return;
            if (
                event.target.closest('.blocklyFlyoutScrollbar') ||
                event.target.closest('.blocklyFlyout') ||
                event.target.closest('.blocklyToolbox')
            ) return;

            // Workspace interaction - prevent window scrolling
            event.preventDefault()

            if (event.ctrlKey) {
                // Zoom override
                const mouseSvgCoords = utils.browserEvents.mouseToSvg(
                    (averageTouch.current ? averageTouch : event) as MouseEvent, // Get average of touch coordinates if using touchscreen
                    workspace.getParentSvg(), 
                    workspace.getInverseScreenCTM()
                )
                averageTouch.current = false;

                workspace.zoom(
                    mouseSvgCoords.x,
                    mouseSvgCoords.y,
                    -event.deltaY * zoomFac,
                )

                return;
            }

            let dx = event.deltaX * scrollSpeed;
            let dy = event.deltaY * scrollSpeed;

            if (dx === 0 && dy !== 0 && event.shiftKey) {
                // Purely vertical scroll with shift key -> horizontal scroll instead
                dx = dy
                dy = 0
            }

            workspace.scroll(workspace.scrollX - dx, workspace.scrollY - dy)
            workspace.render()
        },
        { passive: false },
    )
    const flyoutWorkspace = workspace.getFlyout()?.getWorkspace()
    if (!flyoutWorkspace) throw new Error('Flyout workspace not found')
    let workspaceOldScale = workspace.scale
    // if we change the main workspace scale, we need to change the flyout scale as well, otherwise they will be desynced and look weird
    workspace.addChangeListener((event) => {
        if (
            event.type === Blockly.Events.VIEWPORT_CHANGE &&
            workspace.scale !== workspaceOldScale
        ) {
            const flyoutScrollTop = flyoutWorkspace?.scrollY

            flyoutWorkspace?.setScale(workspace.scale)
            flyoutWorkspace?.scroll(
                0,
                (flyoutScrollTop * workspace.scale) / workspaceOldScale,
            )

            workspaceOldScale = workspace.scale
        }
    })
}
