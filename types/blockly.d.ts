/// <reference types="node" />
import * as Blockly from 'blockly';
import { CustomUndoControls } from '../pages/editor/blockly/customUI';
interface MyWorkspace extends Blockly.WorkspaceSvg {
    undoControls?: CustomUndoControls;
}
declare module '@mit-app-inventor/blockly-plugin-workspace-multiselect'