
import * as Blockly from 'blockly/core';

import { ContinuousMetrics } from '@blockly/continuous-toolbox';

import theme from "./blockly/theme"

import {toolbox, ExtensionToolbox} from "./blockly/toolbox"
import "./blockly/toolboxStyling"

import { ExtensionType, Project } from '~types/projects';
import { getProject, loadBlockly, saveBlockly, renameProject, downloadBlocklyProject, downloadPythonProject, getProjectExtensions } from '@root/blockly/serialization';
import {RoboxToolbox, RoboxFlyout} from './blockly/toolboxStyling';
import {registerFieldColour} from '@blockly/field-colour';
import { registerFieldAngle } from '@blockly/field-angle';
import { postBlocklyWSInjection } from './usb';
import { registerControls } from './controls';


registerFieldAngle();
registerFieldColour();

import "./instructions/UF2Flash"
import "./instructions/colourCalibration"

import { showToast } from '@root/toast';

  

const blocks = require.context("./blockly/blocks", false, /\.ts$/);
const generators = require.context("./blockly/generators", false, /\.ts$/);

blocks.keys().forEach(modulePath => {
    blocks(modulePath);
});

generators.keys().forEach(modulePath => {
    generators(modulePath);
});
document.addEventListener("DOMContentLoaded", () => {
    const workspace = Blockly.inject('blocklyDiv', {
        toolbox: toolbox,
        theme: theme,
        plugins: {
            'flyoutsVerticalToolbox': RoboxFlyout,
            'toolbox': RoboxToolbox,
            "MetricsManager": ContinuousMetrics
        },
        zoom: {
            controls: false,
            maxScale: 2.5,
            minScale: 0.2,
            scaleSpeed: 1.5,
            startScale: 1.0,
            pinch: true
        },
        move:{
            scrollbars: {
                horizontal: true,
                vertical: true
            },
            drag: true,
            wheel: false
        },
        grid: {
            spacing: 20,
            length: 5,
            colour: "#ccc",
        },
        renderer: 'Zelos',
        trashcan: false,
    });
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id')
    let project: null | Project = null
    if (workspaceId) {
        project = getProject(workspaceId)
    }
    else {
        showToast("error", "No Project Selected", "Please select a project to edit.", 5000);
    }
    if (!project) {
        showToast("error", "Project Not Found", "The specified project could not be found.", 5000);
    }

    // Control + scroll for zoom,
    // Scroll for vertical movement,
    // Shift + scroll for horizontal movement
    registerControls(workspace)
    


    // Update flyout scale if workspace scale changes
    const flyoutWorkspace = workspace.getFlyout().getWorkspace();
    let workspaceOldScale = 1;
    workspace.addChangeListener((event) => {
        if (event.type === Blockly.Events.VIEWPORT_CHANGE && workspace.scale !== workspaceOldScale) {
            const flyoutScrollTop = flyoutWorkspace.scrollY;
            
            flyoutWorkspace.setScale(workspace.scale);
            flyoutWorkspace.scroll(0, flyoutScrollTop * workspace.scale / workspaceOldScale);

            workspaceOldScale = workspace.scale;
        }
    });

    if ("serial" in navigator) {
        postBlocklyWSInjection(workspaceId);
    }
    else {
        showToast("warning", "Browser Incompatibility", "Web Serial API is not supported in this browser. Please try a different browser like Chrome or Firefox. If you are using a supported browser, ensure that you have enabled the Web Serial API in your browser settings. ", 5000);

        const connectionManagment = document.getElementById("connection-management")
        const downloadRoboxManagment = document.getElementById("code-download-robox-button")
        if (!connectionManagment) return
        if (!downloadRoboxManagment) return 

        connectionManagment.setAttribute("status",  "no-serial")
        downloadRoboxManagment.addEventListener("click", () => {
            downloadPythonProject(workspace, workspaceId)
        })

    }
    
    const nameForm = document.getElementById("project-name-form") as HTMLFormElement | null
    const nameInput = document.getElementById("project-name-input") as HTMLInputElement | null
    const downloadButton = document.getElementById("robox-project-download") as HTMLButtonElement | null
    if (!downloadButton) return;
    if (!nameInput) return;
    if (!nameForm) return;

    nameInput.value = project["name"]
    document.title = `${nameInput.value} - Ro/Box`;

    nameInput.addEventListener("input", () => {
        document.title = `${nameInput.value} - Ro/Box`
    })
    nameInput.addEventListener("blur", () => {
        if (nameInput.value !== project["name"]) {
            const newName = nameInput.value
            renameProject(workspaceId, newName)
            showToast("success", "Project Renamed", `Project has been renamed to "${newName}"`, 3000);
        }
    })
    nameForm.addEventListener("submit", (event) => {
        event.preventDefault()
        if (nameInput.value !== project["name"]) {
            const newName = nameInput.value
            renameProject(workspaceId, newName)
        }
    })
    downloadButton.addEventListener("click", () => {
        saveBlockly(workspaceId, workspace)
        downloadBlocklyProject(workspaceId)
    })
    


    loadBlockly(workspaceId, workspace)

    if (project["thumbnail"] === '') {
        saveBlockly(workspaceId, workspace);
    }
    workspace.addChangeListener((event) => { // Saving every time block is added
        if (event.isUiEvent) return;
        saveBlockly(workspaceId, workspace);
    });
    // Extend first category
    const firstCategory = document.querySelector(".blocklyToolboxCategory")
    const icon = firstCategory.querySelector(".categoryIcon") as HTMLElement;
    const extender = firstCategory.querySelector(".extender") as HTMLElement;
    if (icon && extender) {
        // Temp disable transitions
        icon.style.transition = "none";
        extender.style.transition = "none";

        icon.style.marginLeft = "20px";
        extender.classList.add("extended");

        setTimeout(() => {
            const transitionBoilerplate = "0.3s ease";
            icon.style.transition = `margin-left ${transitionBoilerplate}`;
            extender.style.transition = `width ${transitionBoilerplate}`;
        }, 1)
    }
    const settingsButton = document.getElementById("robox-settings-button")
    if (!settingsButton) return;
    settingsButton?.addEventListener("click", (event) => {
        //Rotate the cog as an animation
        const cog = document.querySelector('#robox-settings-button svg') as HTMLElement | null;
        if (!cog) return
        rotateOneTooth(cog);
        const dialog = document.getElementById("settings-toolbar") as HTMLDialogElement | null
        if (!dialog || dialog.open ) return
        dialog.show()
        event.stopPropagation()
    })
    // Setting up the extension stuff
    const extensionModal = document.getElementById("extension-modal") as HTMLDialogElement | null;
    const extensions = extensionModal.querySelectorAll(".card");
    const extensionButton = document.getElementById("robox-extension-button")
    if (!extensionButton || !extensionModal) return;
    extensionButton?.addEventListener("click", () => {
        extensionModalSetup(workspaceId);
        extensionModal.showModal()
    })
    extensions.forEach((extensionCard) => {
        extensionCard.addEventListener("click", () => {
            const extensionType = extensionCard.getAttribute("extension-type");
            if (isValidExtension(extensionType) === false) return;
            const extensions = getProjectExtensions(workspaceId);
            if (!extensions) return;
            const enabled = toggleExtension(workspaceId, ExtensionType[extensionType]);
            toggleExtensionUI(workspaceId, ExtensionType[extensionType], enabled);
        })
    })
    if (workspaceId) {
        setExtensionToolbox(getProjectExtensions(workspaceId));
    }

    //Preventing orphans
    workspace.addChangeListener(Blockly.Events.disableOrphans);
}) 
function extensionModalSetup(uuid: string): null | void {
    const extensionModal = document.getElementById("extension-modal") as HTMLDialogElement | null;
    if (!extensionModal) return null;
    
    const extensions = getProjectExtensions(uuid);
    if (!extensions) return null;
    for (const ext of Object.values(ExtensionType)) {
        toggleExtensionUI(uuid, ext, extensions[ext]);
    }

}
function toggleExtensionUI(uuid: string, extension: ExtensionType, enabled: boolean): void {
    const extensionToggle = document.querySelector(`#extension-${extension.toLowerCase()}`) as HTMLElement | null;
    if (!extensionToggle) return;
    if (enabled) {
        extensionToggle.classList.add("enabled")
        extensionToggle.classList.remove("disabled")
    } else {
        extensionToggle.classList.add("disabled")
        extensionToggle.classList.remove("enabled")
    }
}
let rotation = 0;
const degreesPerTooth = 60; // Adjust this value to match one gear tooth visually
function rotateOneTooth(cog: HTMLElement) {
    rotation += degreesPerTooth;
    cog.style.transition = 'transform 0.5s ease-out';
    cog.style.transform = `rotate(${rotation}deg)`;
}
function isValidExtension(ext: string): ext is keyof typeof ExtensionType {
    return ext.toUpperCase() in ExtensionType;
}
function toggleExtension(uuid: string, extension: ExtensionType):boolean {
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
function checkIfExtensionBlocksExist(extension: ExtensionType): boolean {
    const workspace = Blockly.getMainWorkspace();
    const allBlocks = workspace.getAllBlocks(false);
    for (const block of allBlocks) {
        if (block.type.startsWith(extension.toLowerCase())) {
            return true;
        }
    }
    return false;
}
function setExtensionToolbox(extensions: Record<ExtensionType, boolean>) {
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
    for (const ext of Object.values(ExtensionType)) {
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