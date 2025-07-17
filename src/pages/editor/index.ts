
import * as Blockly from 'blockly';

import { ContinuousMetrics } from '@blockly/continuous-toolbox';

import theme from "./blockly/theme"

import {toolbox} from "./blockly/toolbox"
import "./blockly/toolboxStyling"

import { CustomUndoControls } from './blockly/customUI';
import { MyWorkspace } from 'types/blockly';

import { Project } from 'types/projects';
import { getProject, loadBlockly, saveBlockly, renameProject, downloadBlocklyProject } from '../../root/serialization';

import {registerFieldColour} from '@blockly/field-colour';
import { postBlocklyWSInjection } from './usb';
import { registerControls } from './controls';

registerFieldColour();

import "./instructions/UF2Flash"
import "./instructions/colourCalibration"



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
            'flyoutsVerticalToolbox': "RoboxFlyout",
            'toolbox': "RoboxToolbox",
            "MetricsManager": ContinuousMetrics
        },
        zoom: {
            controls: false,
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
    }) as MyWorkspace;
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id')
    let project: null | Project = null
    if (workspaceId) {
        project = getProject(workspaceId)
    }
    else window.location.href = "/student"
    if (!project) return

    // Control + scroll for zoom,
    // Scroll for vertical movement,
    // Shift + scroll for horizontal movement
    registerControls(workspace)
    if ("serial" in navigator) {
        postBlocklyWSInjection()
    }
    else {
        const connectionManagment = document.getElementById("connection-management")
        const downloadRoboxManagment = document.getElementById("code-download-robox-button")
        if (!connectionManagment) return
        if (!downloadRoboxManagment) return 

        connectionManagment.setAttribute("status",  "no-serial")
        downloadRoboxManagment.addEventListener("click", () => {
            downloadBlocklyProject(workspaceId)
        })
    }
    workspace.undoControls = new CustomUndoControls(workspace)
    workspace.undoControls.init()
    
    
    const nameForm = document.getElementById("project-name-form") as HTMLFormElement | null
    const nameInput = document.getElementById("project-name-input") as HTMLInputElement | null
    const downloadButton = document.getElementById("download-button") as HTMLButtonElement | null
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
        icon.style.transitionProperty = "none";
        extender.style.transitionProperty = "none";

        icon.style.marginLeft = "20px";
        extender.classList.add("extended");

        setTimeout(() => {
            const transition = "margin-left 0.3s ease";
            icon.style.transition = transition;
            extender.style.transition = "width 0.3s ease";
        }, 1)
    }
    
    workspace.addChangeListener(Blockly.Events.disableOrphans);

}) 


