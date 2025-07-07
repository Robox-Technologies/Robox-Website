import { pico } from "../communication/communicate"
let calibrated = false
let waitingForCalibration = false
//TODO: Probably need to do some cleanup for this

document.addEventListener("DOMContentLoaded", () => {
    // Define the calibration model stage 1
    let calibrateModal = document.getElementById("color-calibration-modal") as HTMLDialogElement | null
    if (!calibrateModal) return
    let calibrateOutcomeModal = document.getElementById("color-calibration-outcome-modal") as HTMLDialogElement | null
    if (!calibrateOutcomeModal) return
    let calibrateButton = document.getElementById("calibrate-button") as HTMLButtonElement | null
    if (!calibrateButton) return
    // Define the calibration model stage 2
    let outcomeText = calibrateOutcomeModal.querySelector(".modal-content p") as HTMLParagraphElement | null
    if (!outcomeText) return
    let outcomeButton = calibrateOutcomeModal.querySelector("#calibrate-outcome-button") as HTMLButtonElement | null
    if (!outcomeButton) return
    let outcomeTitle = calibrateOutcomeModal.querySelector(".modal-title") as HTMLHeadingElement | null
    if (!outcomeTitle) return
    const settingsButton = document.getElementById("robox-settings-calibrate") as HTMLButtonElement | null
    if (!settingsButton) return
    const connectionManagment = document.getElementById("connection-managment")
    if (!connectionManagment) return
    //The actual opening of the modal
    settingsButton.addEventListener("click", () => {
        if (connectionManagment.getAttribute("status") === "disconnected") {
            outcomeText.textContent = "The Ro/Box does not seem to be connected, please try to connect to it before starting the calibration process"
            outcomeButton.textContent = "Close!"
            outcomeTitle.textContent = "Ro/Box not connected!"
            calibrateOutcomeModal.showModal()
        }
        else {
            calibrateModal.showModal()
        }
    })
    calibrateModal.addEventListener("close", () => {
        if (calibrateModal.querySelector("#calibrate-button[calibrating]")) {
            calibrateModal.querySelector("#calibrate-button")?.removeAttribute("calibrating")
        }
    })
    // When the pico tells it is calibrated
    pico.addEventListener("calibrated", () => {
        calibrated = true //Successful calibration!

        outcomeText.textContent = "Calibration was a success!\nThe calibration settings have been saved to the Ro/Box's Pico."
        outcomeButton.textContent = "Done"
        outcomeTitle.textContent = "Ro/Box Calibrated!"
        // Close whatever modal is already open
        if (calibrateModal.hasAttribute("open")) calibrateModal.close()
        if (calibrateOutcomeModal.hasAttribute("open")) calibrateOutcomeModal.close()
        calibrateOutcomeModal.showModal()
    })
    
    // When the pico errors
    pico.addEventListener("error", (event) => {
        const picoEvent = event as CustomEvent
        // When the pico says it isnt connected to a colour sensor
        if (picoEvent.detail.message === "The color sensor is not properly connected") {
            //Show failure to calibrate
            failedCalibration(true)
        }
    })

    // When you click the calibrate button... calibrate (stage 1)
    calibrateButton.addEventListener("click", () => {
        calibrateButton.setAttribute("calibrating", "")
        // Only if the calibration modal is open
        if (calibrateModal.hasAttribute("open")) {
            calibrate()
        }
    })
    //When you click the outcome button (stage 2)
    outcomeButton.addEventListener("click", () => {
        if (outcomeButton.textContent === "Retry") { // We know we are in the failed state
            outcomeButton.setAttribute("calibrating", "")
            calibrate(true) // Retry calibration
        }
        else { // We know we are in the success state!
            calibrateOutcomeModal.close()
        }
    })
    function calibrate(failed = false) {
        //if failed is true then its a timeout... could be useful for a restart
        if (failed) {
            pico.restart()
            pico.addEventListener("connect", ()=> {
                pico.calibrate()
                setTimeout(() => {
                    if (!calibrated && !calibrateOutcomeModal?.hasAttribute("open")) failedCalibration()
                }, 1000)
            }, {once: true})
        }
        else {
            pico.calibrate()
            setTimeout(() => {
                if (!calibrated && !calibrateOutcomeModal?.hasAttribute("open")) failedCalibration()    
            }, 1000)    
        }
    }
    function failedCalibration(colourSensor = false) {
        if (!outcomeText) return
        if (!outcomeButton) return
        if (!outcomeTitle) return
        if (!calibrateModal) return
        if (!calibrateOutcomeModal) return
        if (colourSensor) {
            outcomeText.textContent = "Calibration was not successful!\nIt seems that the color sensor is not connected properly to the Pico\nPlease ensure that the SDA wire is connected to GPIO20 and SCL to GPIO21 (and the light is on)"
        }
        else {
            outcomeText.textContent = "Calibration was not successful!\nIt seems that the Ro/Box is not responding to instructions!\nPlease follow the UF2 flashing guide to ensure a fresh and up to date Ro/Box"
        }
        if (outcomeButton.hasAttribute("calibrating")) outcomeButton.removeAttribute("calibrating")
        outcomeButton.innerHTML = 'Retry<i class="fa-solid fa-spinner fa-spin"></i>'
        if (calibrateModal.hasAttribute("open")) calibrateModal.close()
        if (calibrateOutcomeModal.hasAttribute("open")) calibrateOutcomeModal.close()
        outcomeTitle.textContent = "Ro/Box Failed Calibration"
        if (calibrateOutcomeModal.hasAttribute("open")) return
        calibrateOutcomeModal?.showModal()
    }
})

