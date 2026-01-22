import { Extension, extensionKeys, Project, UserExtensions } from "~types/projects";
import extensions from "../extensions.json" with { type: "json" };
import { showToast } from "@root/toast";
import { ExtensionToolbox } from "../blockly/toolbox";
import {toolbox} from "../blockly/toolbox"

import * as Blockly from "blockly";
const parsedExtensions = typeof extensions == "string" ? JSON.parse(extensions) : extensions;
export function addExtensions() {
    const extensionModal = document.getElementById("extension-modal") as HTMLDialogElement | null;
    if (!extensionModal) return;
    
    const extensionContainer = extensionModal.querySelector(".modal-content") as HTMLElement | null;
    if (!extensionContainer) return;
    for (const ext of extensionKeys) {
        const cardTemplate = document.getElementById(`extension-toggle-template`) as HTMLTemplateElement | null;
        const card = cardTemplate.content.firstElementChild.cloneNode(true) as HTMLElement | null;
        if (!card) return;

        const extensionInfo = parsedExtensions[ext];
        const { name, description, image } = extensionInfo;
        const nameElement = card.querySelector(".card-title") as HTMLElement | null;
        const descriptionElement = card.querySelector(".card-descriptions") as HTMLElement | null;
        const imgElement = card.querySelector(".card-image") as HTMLImageElement | null;
        if (!nameElement || !descriptionElement || !imgElement) return;

        card.querySelector(".card-title").textContent = name;

        const descriptionEl = document.createElement("p");
        descriptionEl.textContent = description;
        descriptionElement.appendChild(descriptionEl);

        card.querySelector(".card-descriptions")
        
        card.setAttribute("extension-type", ext.toString());
        imgElement.src = image;
        extensionContainer.appendChild(card);
    }
}
export function isValidExtension(ext: string): ext is Extension {
    return extensionKeys.includes(ext as Extension);
}
export function toggleExtension(uuid: string, extension: Extension):boolean {
    if (checkIfExtensionBlocksExist(extension)) {
        showToast("error", "Cannot Disable Extension", `Please remove all blocks from the ${extension} extension before disabling it.`, 5000);
        return true; // Still enabled
    }


    const projects = JSON.parse(localStorage.getItem("roboxProjects") || "{}") as Record<string, Project>;
    if (!projects[uuid]) {
        console.error(`Project with UUID ${uuid} not found.`);
        return false;
    }
    projects[uuid]["extensions"][extension] = !projects[uuid]["extensions"][extension];
    localStorage.setItem("roboxProjects", JSON.stringify(projects));
    setExtensionToolbox(projects[uuid]["extensions"]);
    return projects[uuid]["extensions"][extension];
}
export function checkIfExtensionBlocksExist(extension: Extension): boolean {
    const workspace = Blockly.getMainWorkspace();
    const allBlocks = workspace.getAllBlocks(false);
    for (const block of allBlocks) {
        if (block.type.startsWith(extension.toLowerCase())) {
            return true;
        }
    }
    return false;
}
export function setExtensionToolbox(extensions: UserExtensions | null): void {
    const workspace = Blockly.getMainWorkspace();
    // Assert that workspace is workspaceSVG
    if (!(workspace instanceof Blockly.WorkspaceSvg)) {
        console.error("Workspace is not of type Blockly.WorkspaceSvg");
        return;
    }
    if (!extensions) {
        console.error("Extensions object is null or undefined");
        return;
    }
    //Create a new toolbox with the extensions categories added
    const newToolbox = structuredClone(toolbox)
    for (const ext of extensionKeys) {
        if (extensions[ext]) {
            const extToolbox = ExtensionToolbox[ext];
            if (extToolbox) {
                //@ts-expect-error Blockly for some reason requires the custom type to be present... but this is not a custom category
                newToolbox.contents.push(extToolbox);
            }
        }
    }
    workspace.updateToolbox(newToolbox);
    //Refresh the continuous toolbox
    workspace.getToolbox().refreshSelection();
}