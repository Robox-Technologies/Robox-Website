//Stages of flashing 
// 1. Detecting if in bootsel
// 1-A. If not then put them in bootsel (either via instructions or automatic)
// 2. Choosing the UF2 (gonna be latest for now)
// 3. Actually flashing the pico
import { pico } from "../communication/communicate";
const failureText = {
    "no-device": {
        "title": "RO\\BOX not in BOOTSEL mode",
        "text": `Unfortunately that did not work! Please follow the following instructions to manually boot your RO\\BOX into BOOTSEL mode<br>
                1. Disconnect the USB cable from your RO\\BOX<br>
                2. Hold down the BOOTSEL button on your RO\\BOX<br> 
                3. While holding the BOOTSEL button, connect the USB cable to your RO\\BOX<br>
                4. Release the BOOTSEL button<br>
                5. Click the 'Retry' button below to check if your RO\\BOX is now in BOOTSEL mode
        `,
        "button": "Retry",
    },
    "uf2-web": {
        "title": "Could not flash UF2",
        "text": "Unfortunately we could not fetch the UF2 file from our servers, please report this!.",
        "button": "Close",
    },
    "file-failure": {
        "title": "Failed to write UF2 file",
        "text": "Unfortunately we could not write the UF2 file to your RO\\BOX. Please ensure you selected the RPI-RP2 drive and try again.",
        "button": "Retry",
    },
    "write-failure": {
        "title": "Failed to write UF2 file",
        "text": "Unfortunately we could not write the UF2 file to your RO\\BOX. Please try again.",
        "button": "Retry",
    },
    "success": {
        "title": "RO\\BOX successfully flashed!",
        "text": "Your RO\\BOX has been successfully flashed with the latest firmware! You can now close this dialog and start using your RO\\BOX.",
        "button": "Close",
    },
    "default": {
        "title": "RO\\BOX Flashing Error",
        "text": "An unknown error occurred while flashing your RO\\BOX. Please try again or contact support.",
        "button": "Close",
    },

}

document.addEventListener("DOMContentLoaded", () => {
    const outcomeModal = document.querySelector("dialog#bootsel-outcome") as HTMLDialogElement | null;
    const outcomeText = outcomeModal?.querySelector("#bootsel-outcome-text") as HTMLElement | null;
    const outcomeButton = outcomeModal?.querySelector("button#outcome-button") as HTMLButtonElement | null;
    const outcomeTitle = outcomeModal?.querySelector(".modal-title") as HTMLElement | null;
    if (!outcomeModal || !outcomeText || !outcomeButton || !outcomeTitle) return;


    const stage1Modal = document.querySelector("dialog#bootsel-boot") as HTMLDialogElement | null;
    if (!stage1Modal) return;
    const autoBootselButton = document.querySelector("button#boot-try") as HTMLButtonElement | null;
    if (!autoBootselButton) return;
    const bootselFlashButton = document.querySelector("button#robox-settings-flash") as HTMLButtonElement | null;
    if (!bootselFlashButton) return;

    const stage2Modal = document.querySelector("dialog#bootsel-flash") as HTMLDialogElement | null;
    const fileOpenButton = stage2Modal?.querySelector("button#open-file") as HTMLButtonElement | null;
    if (!stage2Modal || !fileOpenButton) return;
    fileOpenButton.addEventListener("click", async () => {
        // Get the UF2 file from /public/uf2/latest.uf2
        const response = await fetch("/uf2/latest.uf2");
        if (!response.ok) {
            console.error("Failed to fetch the UF2 file.");
            return;
        }
        const uf2Buffer = await response.arrayBuffer();
        // Open the file picker dialog
        const dirHandle = await window.showDirectoryPicker();
        if (!dirHandle.name.includes("RPI-RP2")) {
            flashFailure("file-failure");
            stage2Modal.close();
            return;
        }
        stage2Modal.setAttribute("loading", "");
        const fileHandle = await dirHandle.getFileHandle("robox.uf2", { create: true });
        const writable = await fileHandle.createWritable();
        try {
            await writable.write(uf2Buffer);
            await writable.close();
            // Successfully written the UF2 file
            stage2Modal.removeAttribute("loading");
            stage2Modal.close();
            flashFailure("success");
            outcomeModal.showModal();
        } catch (error) {
            console.error("Failed to write the UF2 file:", error);
            flashFailure("file-failure");
        }
    });

    autoBootselButton.addEventListener("click", async () => {
        //Request the access to the USB device
        try {
            await navigator.usb.requestDevice({ filters: [{ vendorId: 0x2e8a }] });
        } catch (error) {
            stage1Modal.removeAttribute("loading");
            stage1Modal.close();
            flashFailure("no-device");
            return;
        }
        const bootselSpin = autoBootselButton.querySelector(".fa-spinner") as HTMLElement | null;
        if (!bootselSpin) return;
        stage1Modal.setAttribute("loading", "");
        pico.bootsel();
        setTimeout(async () => { // Set out a 1s delay to firmware check
            if (await detectBOOTSEL()) { // We are in bootsel mode
                stage1Modal.removeAttribute("loading");
                // Move to stage 2
                stage1Modal.close();
                stage2Modal.showModal();
            }
            else { // The pico is not flashed with any firmware and is not responding to stuff
                stage1Modal.removeAttribute("loading");
                stage1Modal.close();
                flashFailure("no-device");
            }
        }, 1000);
    });

    outcomeButton.addEventListener("click", async () => {
        let failure = outcomeModal.getAttribute("failure");
        if (failure === "no-device") { // When they cannot automatically boot into BOOTSEL mode
            // Try and request the USB device again
            try {
                await navigator.usb.requestDevice({ filters: [{ vendorId: 0x2e8a }] });
            } catch (error) {
                flashFailure("no-device");
                return;
            }
            //Recheck if the device is in BOOTSEL mode
            let checkBOOTSEL = await detectBOOTSEL();
            if (checkBOOTSEL) {
                outcomeModal.close();
                stage2Modal.showModal(); // If it is then we can move to the next stage
            }
            else {
                flashFailure("no-device");
            }
        }
        else if (failure === "uf2-web") { // When they cannot fetch the UF2 file
            outcomeModal.close();
        }
        else if (failure === "file-failure" || failure === "write-failure") { // When they cannot write the UF2 file
            outcomeModal.close();
            stage2Modal.showModal(); // Reopen the stage 2 modal to try again
        }
        else if (failure === "success") { // When they successfully flashed the RO\\BOX
            outcomeModal.close();
        }
    });
    function flashFailure(failure: string) {
        if (!outcomeModal || !outcomeText || !outcomeButton || !outcomeTitle) return;
        outcomeModal.setAttribute("failure", failure);
        
        const failureData = failureText[failure] || failureText["default"];
        outcomeTitle.textContent = failureData.title;
        outcomeText.innerHTML = failureData.text;
        outcomeButton.textContent = failureData.button;
    }

    bootselFlashButton.addEventListener("click", async () => {
        if (stage1Modal.hasAttribute("open")) {
            stage1Modal.close();
        } else {
            if (await detectBOOTSEL()) { // If the pico is already in BOOTSEL mode
                stage2Modal.showModal(); // Show the stage 2 modal
            } else {
                stage1Modal.showModal();
            }   
        }
    });
})

async function detectBOOTSEL() {
    let devices = await navigator.usb.getDevices()
    return devices.some(device => device.productName === "RP2 Boot");
}