import { controller, vm } from "..";
import { BaseLayer } from "../globals";

const layer: BaseLayer = {
	name: "Inputs",
	activator: "button:Inputs",
	start: () => {
		controller.right().setControlButton("Inputs", "BLINK");
	},
	stop: () => {
		controller.right().setControlButton("Inputs", "OFF");
	},
};

export default layer;
