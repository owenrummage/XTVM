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
import { clearTopScreens } from "../helpers/xtctlHelper";
import { muteChannelActionListener, setMuteButtonLeds } from "../helpers/voicemeeter/mute";
import { setTopScreen } from "../helpers/topScreen";

let selectedBus = config.defaultBus;
let hasBusSelected = false;

function refreshFromVM() {
	// Set all of the sends by bus from voicemeeter
	// TODO: Expand sends to helper
	for (let i = 0; i < 8; i++) {
		const vmBusName = VoicemeeterChannelNames[
			selectedBus
		] as keyof typeof VoicemeeterChannelNames;
		const curState = Math.floor(vm.parameters.Strip(i)[vmBusName].get());
		controller.channel(i + 1).setButton("SEL", curState === 1 ? "SOLID" : "OFF");
	}

	setMuteButtonLeds();

	// Set Bus Name LCDs
	// TODO: Expand top LCDs to helper
	const busLabel = vm.parameters.Bus(selectedBus).Label.get();
	const words = busLabel.split(" ");
	const busLabelWords: string[] = [];

	for (const word of words) {
		if (word.length <= 7) {
			busLabelWords.push(word);
		} else {
			let start = 0;
			while (start < word.length) {
				busLabelWords.push(word.substring(start, start + 7));
				start += 7;
			}
		}
	}

	clearTopScreens();
	setTopScreen(busLabelWords.slice(0, 8), "layer");
	setBottomLabelLCDs();

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
	if (key.action.startsWith("F")) {
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

async function channelActionListener(e) {
	console.log("Channel Action", e);
	if (e.state === "keyDown") {
		switch (e.action) {
			case "select": {
				// Handle sends from input strips to busses in both voicemeeter and the controller
				const bus = selectedBus;
				const vmInChannel = e.channel - 1;
				const vmBusName = VoicemeeterChannelNames[
					bus
				] as keyof typeof VoicemeeterChannelNames;

				const curState = Math.floor(
					vm.parameters.Strip(vmInChannel)[vmBusName].get()
				);

				let newState = 0;
				if (curState === 0) newState = 1; // If 0 then 1 and if 1 stay 0

				vm.parameters.Strip(vmInChannel)[vmBusName].set(newState);
				controller
					.channel(e.channel)
					.setButton("SEL", newState === 1 ? "SOLID" : "OFF");
				break;
			}
		}
	}
}

let lastBusVMSelected = false;

function start() {
	controller.right().setControlButton("Busses", "SOLID");

	if (lastBusVMSelected) {
		vm.parameters.Bus(selectedBus).Sel.set(1);
		lastBusVMSelected = false;
	}

	setFLeds(("F" + (selectedBus + 1)) as ControlType);
	vuMeterStripsTask(true);

	setupVMFadeInputListener(FADER_TYPES.STRIP, FADER_TYPES.BUS, selectedBus);

	refreshFromVM();

	controller.addListener("keyDown", keyDownListener);
	controller.addListener("channelAction", channelActionListener);
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
	controller.removeListener("channelAction", channelActionListener);
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
