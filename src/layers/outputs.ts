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

function refreshFromVM() {
	setMuteButtonLeds();
	clearTopScreens();
	setBottomLabelLCDs();

	runConfiguredFaderChecks();
}

function start() {
	controller.right().setControlButton("Outputs", "SOLID");

	vuMeterBusesTask(true);

	setupVMFadeInputListener(FADER_TYPES.BUS, FADER_TYPES.BUS, 10);

	refreshFromVM();

	controller.addListener("channelAction", muteChannelActionListener);
	vmEventEmitter.addListener("change", refreshFromVM);
}

function stop() {
	controller.right().setControlButton("Outputs", "OFF");

	vuMeterBusesTask(false);

	takeDownVMFadeInputListener();
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
