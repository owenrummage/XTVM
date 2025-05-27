import { ControlType } from "xtouch-control";
import { controller, vm } from "../..";
import { getLeftFadersType } from "./vmFadeListener";
import { FADER_TYPES } from "./voicemeeterConstantsAndTypes";

export function setFLeds(input?: ControlType) {
	controller.right().setControlButton(`F1`, "OFF");
	controller.right().setControlButton(`F2`, "OFF");
	controller.right().setControlButton(`F3`, "OFF");
	controller.right().setControlButton(`F4`, "OFF");
	controller.right().setControlButton(`F5`, "OFF");
	controller.right().setControlButton(`F6`, "OFF");
	controller.right().setControlButton(`F7`, "OFF");
	controller.right().setControlButton(`F8`, "OFF");

	if (input) controller.right().setControlButton(input, "SOLID");
}

export function convertToDB(value: number): number {
	// Convert 0-127 to -60 to +12
	return (value / 127) * (12 - -60) + -60;
}

export function convertToPercent(value: number): number {
	// Convert 0-127 to 0-100
	return (value / 127) * 100;
}

export function convertFromDB(value: number): number {
	// Convert -60 to +12 to 0-127
	return ((value - -60) / (12 - -60)) * 127;
}

// Turn off selection on vm bus and turn on selection for input
export function selectBus(index: number) {
	for (let i = 0; i < 8; i++) {
		vm.parameters.Bus(i).Sel.set(0);
	}
	vm.parameters.Bus(index).Sel.set(1);
}

function getLabelByFaderType(type: FADER_TYPES, channel: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return vm.parameters.Bus(channel).Label.get();
		case FADER_TYPES.STRIP:
			return vm.parameters.Strip(channel).Label.get();
	}
}

// Get vm labels and set bottom lcd lines to them
export function setBottomLabelLCDs() {
	for (let i = 0; i < 8; i++) {
		const label = getLabelByFaderType(getLeftFadersType(), i);
		if (label) controller.channel(i + 1).setScreen("BOTTOM", label);
	}
}
