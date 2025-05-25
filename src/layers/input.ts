import { controller, vm } from ".."
import { baseLayer } from "../globals"

const layer: baseLayer = {
    name: "Inputs",
    activator: "button:Inputs",
    start: () => {
        controller.right().setControlButton("Inputs", "BLINK")
    },
    stop: () => {
        controller.right().setControlButton("Inputs", "OFF")

    },
}

export default layer