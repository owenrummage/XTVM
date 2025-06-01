import { controller } from "..";
import { BaseLayer } from "../globals";
import { selectTopScreenMode, setAndSelectTopScreen } from "../helpers/topScreen";

const defaultMode = "layer";
let pot1 = 1;

/*
Make a pot mode that is for the pedal to send commands for leds
*/

function encoderMoveListener(e) {
	if (e.channel !== 1) return;

	if (e.direction === "left") pot1--;
	if (e.direction === "right") pot1++;

	if (pot1 > 11) pot1 = 11;
	if (pot1 < 1) pot1 = 1;

	console.log("Potentiometer 1 set to", pot1);
	controller.channel(1).setPotentiometerLeds("SINGLE_DOT", pot1);

	switch (pot1) {
		case 1:
			return selectTopScreenMode("layer");
		case 2:
			return setAndSelectTopScreen(["AAAA"], "AAAA");
	}
}

function start() {
	controller.addListener("encoderMove", encoderMoveListener);

	selectTopScreenMode(defaultMode);
}

function stop() {}

const layer: BaseLayer = {
	name: "PotMenu",
	activator: "launch",
	start,
	stop,
};

export default layer;
