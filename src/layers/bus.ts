import { controller, vm } from "..";
import { BaseLayer } from "../globals";

const layer: BaseLayer = {
	name: "Busses",
	activator: "button:Busses",
	start: () => {
		controller.right().setControlButton("Busses", "BLINK");
	},
	stop: () => {
		controller.right().setControlButton("Busses", "OFF");
	},
};

export default layer;
