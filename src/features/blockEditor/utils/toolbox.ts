import type { ToolboxDefinition } from "node_modules/blockly/core/utils/toolbox";
import { BaseToolbox } from "@features/blockEditor/config/toolbox";
//TODO: Make this dynamic
export default function generateToolbox(): ToolboxDefinition {
    return BaseToolbox;
}
