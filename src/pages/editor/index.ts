
import * as Blockly from 'blockly';

import { ContinuousToolbox, ContinuousMetrics, registerContinuousToolbox } from '@blockly/continuous-toolbox';


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
    const block = blocks(modulePath);
});

generators.keys().forEach(modulePath => {
    const generator = generators(modulePath);
    // use generator
});

document.addEventListener("DOMContentLoaded", () => {
    const workspace = Blockly.inject('blocklyDiv', {
        toolbox: toolbox,
        theme: theme,
        plugins: {
            'flyoutsVerticalToolbox': "RoboxFlyout",
            'toolbox': ContinuousToolbox,
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
    else return
    if (!project) return
// Control + scroll for zoom,
// Scroll for vertical movement,
// Shift + scroll for horizontal movement
    registerControls(workspace)
    if ("serial" in navigator) {
        postBlocklyWSInjection()
    }
    else {
        const connectionManagment = document.getElementById("connection-managment")
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
    
    Blockly.browserEvents.conditionalBind(window, 'resize', null, () => { //On workspace resize, resize our custom UI
            if (workspace.undoControls) workspace.undoControls.position()
        }
    );



    
    const nameForm = document.getElementById("project-name-form") as HTMLFormElement | null
    const nameInput = document.getElementById("project-name-input") as HTMLInputElement | null
    const downloadButton = document.getElementById("download-button") as HTMLButtonElement | null
    if (!downloadButton) return
    if (!nameInput) return
    if (!nameForm) return
    nameInput.value = project["name"]
    nameInput.addEventListener("blur", (event) => {
        if (nameInput.value !== project["name"]) {
            let newName = nameInput.value
            renameProject(workspaceId, newName)
        }
    })
    nameForm.addEventListener("submit", (event) => {
        event.preventDefault()
        if (nameInput.value !== project["name"]) {
            let newName = nameInput.value
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
    

    
    //Prevents the flyout from closing (the category being deselected)
    workspace.addChangeListener(function (event) {
        if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
            const toolboxEvent = event as Blockly.Events.ToolboxItemSelect;

            if (!toolboxEvent.newItem && toolboxEvent.oldItem) {
                const toolbox = workspace.getToolbox() as Blockly.Toolbox;
                const allItems = toolbox.getToolboxItems();
                const item = allItems.find(i => (i as any).name_ === toolboxEvent.oldItem);
                if (item) {
                    toolbox.setSelectedItem(item);
                }
            }
        }
    });
    workspace.addChangeListener(Blockly.Events.disableOrphans);

}) 


