import { controller, vmEventEmitter } from "..";
import { BaseLayer } from "../globals";
import { setBottomLabelLCDs, setFLeds } from "../helpers/voicemeeter/helpers";
import { FADER_TYPES } from "../helpers/voicemeeter/constantsAndTypes";
import { vuMeterStripsTask } from "../helpers/voicemeeter/vuMeters";
import { resetFaderStates } from "../helpers/voicemeeter/faderChecks";
import {
	runConfiguredFaderChecks,
	setupVMFadeInputListener,
	takeDownVMFadeInputListener,
} from "../helpers/voicemeeter/fadeListener";
import { clearTopScreens } from "../helpers/xtctlHelper";
import { muteChannelActionListener, setMuteButtonLeds } from "../helpers/voicemeeter/mute";

function refreshFromVM() {
	setMuteButtonLeds();
	clearTopScreens();
	setBottomLabelLCDs();

	runConfiguredFaderChecks();
}

function start() {
	controller.right().setControlButton("Inputs", "SOLID");

	vuMeterStripsTask(true);

	setupVMFadeInputListener(FADER_TYPES.STRIP, FADER_TYPES.NONE, 10);

	refreshFromVM();

	controller.addListener("channelAction", muteChannelActionListener);
	vmEventEmitter.addListener("change", refreshFromVM);
}

function stop() {
	controller.right().setControlButton("Inputs", "OFF");

	vuMeterStripsTask(false);

	takeDownVMFadeInputListener();
	controller.removeListener("channelAction", muteChannelActionListener);
	vmEventEmitter.removeListener("change", refreshFromVM);

	resetFaderStates();
}

const layer: BaseLayer = {
	name: "Inputs",
	activator: "button:Inputs",
	start,
	stop,
};

export default layer;
