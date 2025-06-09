import { ControlType } from "xtouch-control";
import { config, controller, vm, vmEventEmitter } from "..";
import { BaseLayer } from "../globals";
import { selectBus, setBottomLabelLCDs, setFLeds } from "../helpers/voicemeeter/helpers";
import { FADER_TYPES, VoicemeeterChannelNames } from "../helpers/voicemeeter/constantsAndTypes";
import dayjs from "dayjs";
import { vuMeterStripsTask } from "../helpers/voicemeeter/vuMeters";
import { resetFaderStates } from "../helpers/voicemeeter/faderChecks";
import {
	runConfiguredFaderChecks,
	setFaderTypes,
	setupVMFadeInputListener,
	takeDownVMFadeInputListener,
} from "../helpers/voicemeeter/fadeListener";
import { clearTopScreens, isFKey } from "../helpers/xtctlHelper";
import { muteChannelActionListener, setMuteButtonLeds } from "../helpers/voicemeeter/mute";
import { setTopScreen } from "../helpers/topScreen";
import { buildSendListener, setSends } from "../helpers/voicemeeter/sends";
import { setTopScreenVMLabel } from "../helpers/voicemeeter/topScreenLabel";

let selectedBus = config.defaultBus;
let hasBusSelected = false;

function refreshFromVM() {
	setSends(FADER_TYPES.STRIP, selectedBus);
	setMuteButtonLeds();
	setTopScreenVMLabel(FADER_TYPES.BUS, selectedBus);

	// Get selected bus
	setFLeds();
	for (let i = 0; i < 8; i++) {
		const isSelected = vm.parameters.Bus(i).Sel.get() === 1;
		if (isSelected) {
			setFLeds(("F" + (i + 1)) as ControlType);
		}
		if (!isSelected && selectedBus === i) {
			const button = `F${i + 1}` as ControlType;

			controller.right().setControlButton(button, "BLINK");
		}
	}

	runConfiguredFaderChecks();
}

// Listen for F keys for bus change
function keyDownListener(key) {
	if (isFKey(key)) {
		const index = parseInt(key.action.substring(1)) - 1; // Extract index from F key
		if (hasBusSelected && selectedBus === index) {
			hasBusSelected = false;

			vm.parameters.Bus(index).Sel.set(0);

			const button = `F${index + 1}` as ControlType;

			controller.right().setControlButton(button, "BLINK");

			return;
		}
		if (index >= 0 && index < 8) {
			selectBus(index);
			setFLeds(key.action as ControlType);
			selectedBus = index;
			setFaderTypes(FADER_TYPES.STRIP, FADER_TYPES.BUS, selectedBus);
			hasBusSelected = true;
			refreshFromVM();
		}
	}
}

let lastBusVMSelected = false;
let selectListener;

function start() {
	controller.right().setControlButton("Busses", "SOLID");

	if (lastBusVMSelected) {
		vm.parameters.Bus(selectedBus).Sel.set(1);
		lastBusVMSelected = false;
	}

	selectListener = buildSendListener(() => selectedBus, FADER_TYPES.STRIP);

	setFLeds(("F" + (selectedBus + 1)) as ControlType);
	vuMeterStripsTask(true);

	setupVMFadeInputListener(FADER_TYPES.STRIP, FADER_TYPES.BUS, selectedBus);

	refreshFromVM();

	controller.addListener("keyDown", keyDownListener);
	// controller.addListener("channelAction", channelActionListener);
	controller.addListener("channelAction", selectListener);
	controller.addListener("channelAction", muteChannelActionListener);
	vmEventEmitter.addListener("change", refreshFromVM);
}

function stop() {
	controller.right().setControlButton("Busses", "OFF");

	const isBusVMSelected = vm.parameters.Bus(selectedBus).Sel.get() === 1;
	if (isBusVMSelected) lastBusVMSelected = true;

	vuMeterStripsTask(false);

	controller.removeListener("keyDown", keyDownListener);
	takeDownVMFadeInputListener();
	// controller.removeListener("channelAction", channelActionListener);
	controller.removeListener("channelAction", selectListener);
	controller.removeListener("channelAction", muteChannelActionListener);
	vmEventEmitter.removeListener("change", refreshFromVM);

	setFLeds();

	resetFaderStates();
}

const layer: BaseLayer = {
	name: "Busses",
	activator: "button:Busses",
	start,
	stop,
};

export default layer;
