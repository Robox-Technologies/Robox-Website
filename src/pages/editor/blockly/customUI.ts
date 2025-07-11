import * as Blockly from 'blockly';
export class CustomUndoControls {
    private workspace: Blockly.WorkspaceSvg;
    private container: HTMLDivElement | null = null;
  
    constructor(workspace: Blockly.WorkspaceSvg) {
        this.workspace = workspace;
    }
  
    init() {
        if (this.container) return; // already initialized
        this.container = document.createElement('div');
        this.container.id = 'blocklyCustomTimeControls'; //Creating the undo main element
        this.container.style.position = 'absolute';
        this.container.classList.add("uiHolder")
    
        const undo = document.createElement('button');
        undo.classList.add("button", "uiButtons")
        undo.innerHTML = '<i class="fa-solid fa-rotate-left"></i>'; //undo button
        undo.onclick = () => this.workspace.undo(false);

        const redo = document.createElement('button');
        redo.innerHTML = '<i class="fa-solid fa-rotate-right"></i>'; //redo element
        redo.classList.add("button", "uiButtons")
        redo.onclick = () => this.workspace.undo(true);
    
        this.container.appendChild(undo);
        this.container.appendChild(redo);
    
        const parent = this.workspace.getParentSvg()?.parentNode as HTMLElement | null;
        if (parent) {
            parent.appendChild(this.container);
        }
    }
  
    dispose() {
        if (!this.container) return;
        this.container.remove();
        this.container = null;
    }
  
    getBoundingRectangle(): Blockly.utils.Rect | null {
        if (!this.container) return null;
    
        const rect = this.container.getBoundingClientRect();
        return new Blockly.utils.Rect(rect.top, rect.bottom, rect.left, rect.right);
    }
}