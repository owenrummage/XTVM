import { controller, vm } from ".."
import { baseLayer } from "../globals"

const layer: baseLayer = {
    name: "Busses",
    activator: "button:Busses",
    start: () => {
        controller.right().setControlButton("Busses", "BLINK")
    },
    stop: () => {
        controller.right().setControlButton("Busses", "OFF")

    },
}

export default layer