import { ControlType } from "xtouch-control";
import { config, controller, vm, vmEventEmitter } from "..";
import { BaseLayer } from "../globals";
import { selectBus, setFLeds } from "../helpers/vmHelpers";
import { VoicemeeterChannelNames } from "../helpers/voicemeeterConstantsAndTypes";
import dayjs from "dayjs";
import { vuMeterStripsTask } from "../helpers/vmVUMeters";
import { resetFaderStates } from "../helpers/vmFaderChecks";
import {
	FADER_TYPES,
	runConfiguredFaderChecks,
	setFaderTypes,
	setupVMFadeInputListener,
	takeDownVMFadeInputListener,
} from "../helpers/vmFadeListener";

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

	// Set all of the mutes by bus from voicemeeter
	// TODO: Expand mutes to helper
	for (let i = 0; i < 8; i++) {
		const curState = Math.floor(vm.parameters.Strip(i).Mute.get());
		// console.log("SBMSM", i, curState);
		controller.channel(i + 1).setButton("MUTE", curState === 1 ? "SOLID" : "OFF");
	}

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
	controller.screens().setScreensArray(["", "", "", "", "", "", "", ""]);
	controller.screens().setScreensArray(busLabelWords.slice(0, 8), 0);

	// Get vm strip labels and set bottom lcd lines to them
	// TODO: Expand bottom (strip) labels to helper
	for (let i = 0; i < 8; i++) {
		const label = vm.parameters.Strip(i).Label.get();
		controller.channel(i + 1).setScreen("BOTTOM", label);
	}

	// Get selected bus
	setFLeds();
	for (let i = 0; i < 8; i++) {
		const isSelected = vm.parameters.Bus(i).Sel.get() === 1;
		console.log(i, isSelected, "SB");
		if (isSelected) {
			setFLeds(("F" + (i + 1)) as ControlType);
		}
		if (!isSelected && selectedBus === i) {
			const button = `F${i + 1}` as ControlType;

			controller.right().setControlButton(button, "BLINK");
		}
	}

	console.log("Setting faders");
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

const pttStates: Record<
	number,
	{
		actionRunning: boolean;
		state: boolean;
		time: dayjs.Dayjs;
	}
> = {
	0: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	1: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	2: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	3: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	4: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	5: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	6: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	7: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
	8: {
		actionRunning: false,
		state: false,
		time: dayjs(),
	},
};
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
			case "mute": {
				// Handling muting/unmuting
				const vmInChannel = e.channel - 1;
				const isMutedNumber = Math.floor(
					vm.parameters.Strip(vmInChannel).Mute.get()
				);
				const isMuted = isMutedNumber === 1 ? true : false;
				console.log(e.channel, "Muted:", isMuted);
				if (isMuted === false) {
					// Was not muted, mute
					pttStates[e.channel].actionRunning = true;
					vm.parameters.Strip(vmInChannel).Mute.set(1);
					controller.channel(e.channel).setButton("MUTE", "SOLID");
				} else {
					// Was muted, unmute and wait for keyUp (state = true and time set) to test for PTT
					pttStates[e.channel].time = dayjs();
					pttStates[e.channel].state = true;
					vm.parameters.Strip(vmInChannel).Mute.set(0);
					controller.channel(e.channel).setButton("MUTE", "BLINK");
				}
				break;
			}
		}
	}

	if (e.state === "keyUp") {
		switch (e.action) {
			case "mute": {
				// Handling muting/unmuting
				const vmInChannel = e.channel - 1;
				const isMutedNumber = Math.floor(
					vm.parameters.Strip(vmInChannel).Mute.get()
				);
				const isMuted = isMutedNumber === 1 ? true : false;
				console.log(e.channel, "Muted:", isMuted);
				if (pttStates[e.channel].actionRunning) {
					pttStates[e.channel].actionRunning = false;
					return;
				}
				if (isMuted === false && pttStates[e.channel].state === true) {
					// Was muted on keyDown and now is unmuted, state is true so we should check for ptt
					const newTime = dayjs();
					const oldTime = pttStates[e.channel].time;
					const diffTime = newTime.diff(oldTime, "millisecond");
					if (diffTime > 750) {
						// The button was held for more than 3/4th of a second
						// PTT -> Remute
						pttStates[e.channel].state = false;
						vm.parameters.Strip(vmInChannel).Mute.set(1);
						controller
							.channel(e.channel)
							.setButton("MUTE", "SOLID");
					} else {
						// No ptt, stay unmuted
						controller
							.channel(e.channel)
							.setButton("MUTE", "OFF");
					}
				}
				break;
			}
			case "pedal1": {
				for (let channel = 0; channel < 8; channel++) {
					vm.parameters.Bus(channel).Mute.set(1);
				}
				break;
			}
		}
	}
}

function start() {
	controller.right().setControlButton("Busses", "SOLID");

	setFLeds(("F" + (selectedBus + 1)) as ControlType);
	vuMeterStripsTask(true);
	refreshFromVM();

	controller.addListener("keyDown", keyDownListener);
	setupVMFadeInputListener(FADER_TYPES.STRIP, FADER_TYPES.BUS, selectedBus);
	controller.addListener("channelAction", channelActionListener);
	vmEventEmitter.addListener("change", refreshFromVM);
}

function stop() {
	controller.right().setControlButton("Busses", "OFF");

	vuMeterStripsTask(false);

	controller.removeListener("keyDown", keyDownListener);
	takeDownVMFadeInputListener();
	controller.removeListener("channelAction", channelActionListener);
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
