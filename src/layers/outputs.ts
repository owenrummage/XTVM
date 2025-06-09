import { controller, vmEventEmitter } from "..";
import { BaseLayer } from "../globals";
import { setBottomLabelLCDs, setFLeds } from "../helpers/voicemeeter/helpers";
import { FADER_TYPES } from "../helpers/voicemeeter/constantsAndTypes";
import { resetFaderStates } from "../helpers/voicemeeter/faderChecks";
import {
	runConfiguredFaderChecks,
	setupVMFadeInputListener,
	takeDownVMFadeInputListener,
} from "../helpers/voicemeeter/fadeListener";
import { clearTopScreens } from "../helpers/xtctlHelper";
import { muteChannelActionListener, setMuteButtonLeds } from "../helpers/voicemeeter/mute";
import { vuMeterBusesTask } from "../helpers/voicemeeter/vuMeters";
import { ControlType } from "xtouch-control";
import { buildSendListener, setSends } from "../helpers/voicemeeter/sends";
import { setTopScreenVMLabel } from "../helpers/voicemeeter/topScreenLabel";

let selectedVMChannel = 0;

function refreshFromVM() {
	setMuteButtonLeds();
	clearTopScreens();
	setBottomLabelLCDs();
	setTopScreenVMLabel(FADER_TYPES.STRIP, selectedVMChannel);
	setSends(FADER_TYPES.BUS, selectedVMChannel);

	runConfiguredFaderChecks();
}

function selectStrip(input: number) {
	selectedVMChannel = input;
	setFLeds(("F" + (selectedVMChannel + 1).toString()) as ControlType);
	setupVMFadeInputListener(FADER_TYPES.BUS, FADER_TYPES.STRIP, selectedVMChannel);
	refreshFromVM();
}

// Listen for F keys for bus change
function keyDownListener(key) {
	if (key.action.startsWith("F")) {
		const index = parseInt(key.action.substring(1)) - 1; // Extract index from F key
		selectStrip(index);
	}
}

let selectListener;

function start() {
	controller.right().setControlButton("Outputs", "SOLID");

	vuMeterBusesTask(true);

	selectListener = buildSendListener(() => selectedVMChannel, FADER_TYPES.BUS);

	selectStrip(selectedVMChannel);
	// setupVMFadeInputListener(FADER_TYPES.BUS, FADER_TYPES.STRIP, selectedVMChannel);

	refreshFromVM();

	controller.addListener("keyDown", keyDownListener);
	controller.addListener("channelAction", selectListener);
	controller.addListener("channelAction", muteChannelActionListener);
	vmEventEmitter.addListener("change", refreshFromVM);
}

function stop() {
	controller.right().setControlButton("Outputs", "OFF");

	vuMeterBusesTask(false);

	takeDownVMFadeInputListener();
	controller.removeListener("keyDown", keyDownListener);
	controller.removeListener("channelAction", selectListener);
	controller.removeListener("channelAction", muteChannelActionListener);
	vmEventEmitter.removeListener("change", refreshFromVM);

	resetFaderStates();
}

const layer: BaseLayer = {
	name: "Outputs",
	activator: "button:Outputs",
	start,
	stop,
};

export default layer;
