import dayjs from "dayjs";
import { usb } from "usb";
import { Voicemeeter } from "voicemeeter-connector";
import XTouchController from "xtouch-control";
import { ControlType } from "xtouch-control";

// Page array with object with left and right then in left object do config for pots and config for bus/strip channel

const busNames: Record<number, string> = {
	0: "Side Speakers",
	1: "RIG Headphones",
	2: "Soundbar +Sub",
	3: "Out A4",
	4: "Out A5",
	5: "Out B1",
	6: "Out B2",
	7: "Out B3",
};

const stripFaderStates: Record<number, number> = {
	1: 0,
	2: 0,
	3: 0,
	4: 0,
	5: 0,
	6: 0,
	7: 0,
	8: 0,
};

enum VoicemeeterChannelNames {
	A1 = 0,
	A2 = 1,
	A3 = 2,
	A4 = 3,
	A5 = 4,
	B1 = 5,
	B2 = 6,
	B3 = 7,
}

function convertToDB(value: number): number {
	// Convert 0-127 to -60 to +12
	return (value / 127) * (12 - -60) + -60;
}

function convertFromDB(value: number): number {
	// Convert -60 to +12 to 0-127
	return ((value - -60) / (12 - -60)) * 127;
}

// Check if the strip volumes have changed and set the fader if so
function checkStripFaders(vm: Voicemeeter, controller: XTouchController) {
	for (let i = 0; i < 8; i++) {
		const gain = Number(vm.parameters.Strip(i).Gain.get());
		if (stripFaderStates[i + 1] !== gain) {
			// Strip Changed
			stripFaderStates[i + 1] = gain;
			let newValue = convertFromDB(gain);

			console.log(`Channel ${i + 1} Gain: ${newValue}`);
			controller.channel(i + 1).setFader(newValue);
		}
	}

	const busGain = Number(vm.parameters.Bus(selectedBus).Gain.get());
	if (stripFaderStates[9] !== busGain) {
		// Bus Changed
		stripFaderStates[9] = busGain;
		let newValue = convertFromDB(busGain);

		console.log(`Bus ${selectedBus + 1} Gain: ${newValue}`);
		controller.channel(9).setFader(newValue);
	}
}

// Get vm strip labels and set bottom lcd lines to them
function setLcds(vm: Voicemeeter, controller: XTouchController) {
	for (let i = 0; i < 8; i++) {
		const label = vm.parameters.Strip(i).Label.get();
		controller.channel(i + 1).setScreen("BOTTOM", label);
	}
}

let selectedBus = 0;
let lastSelectedBus = 0;
let hasBusSelected = false;

let functionMode: "BUSSES" | "OUTPUTS" | "INPUTS" = "BUSSES";

// Set F* control buttons off then turn one on by argument
function setBusLeds(controller: XTouchController, input: ControlType) {
	controller.right().setControlButton(`F1`, "OFF");
	controller.right().setControlButton(`F2`, "OFF");
	controller.right().setControlButton(`F3`, "OFF");
	controller.right().setControlButton(`F4`, "OFF");
	controller.right().setControlButton(`F5`, "OFF");
	controller.right().setControlButton(`F6`, "OFF");
	controller.right().setControlButton(`F7`, "OFF");
	controller.right().setControlButton(`F8`, "OFF");

	controller.right().setControlButton(input, "SOLID");
}

// Set control buttons for mode off then turn one on by argument
function setControlLEDs(controller: XTouchController, input: ControlType) {
	controller.right().setControlButton(`Busses`, "OFF");
	controller.right().setControlButton(`Inputs`, "OFF");
	controller.right().setControlButton(`Outputs`, "OFF");

	controller.right().setControlButton(input, "SOLID");
}

// Turn off selection on vm bus and turn on selection for input
function selectBus(vm: Voicemeeter, index: number) {
	for (let i = 0; i < 8; i++) {
		vm.parameters.Bus(i).Sel.set(0);
	}
	vm.parameters.Bus(index).Sel.set(1);
}

// Attach exit handler to close the voicemeeter Dll/API
function attachExitHandler(vm: Voicemeeter) {
	process.stdin.resume(); // so the program will not close instantly

	function exitHandler(options: { cleanup?: boolean; exit?: boolean }, exitCode: number) {
		try {
			vm.disconnect();
		} catch {
			console.log("Voicemeeter Disconnect Error Suppressed");
		}
		if (options.cleanup) console.log("clean");
		if (exitCode || exitCode === 0) console.log(exitCode);
		if (options.exit) process.exit();
	}

	// do something when app is closing
	process.on("exit", exitHandler.bind(null, { cleanup: true }));

	// catches ctrl+c event
	process.on("SIGINT", exitHandler.bind(null, { exit: true }));

	// catches "kill pid" (for example: nodemon restart)
	process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
	process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

	// catches uncaught exceptions
	process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
}

// Set all of the sends by bus from voicemeeter
function setBusSends(vm: Voicemeeter, controller: XTouchController) {
	for (let i = 0; i < 8; i++) {
		const vmBusName = VoicemeeterChannelNames[
			selectedBus
		] as keyof typeof VoicemeeterChannelNames;
		const curState = Math.floor(vm.parameters.Strip(i)[vmBusName].get());
		controller.channel(i + 1).setButton("SEL", curState === 1 ? "SOLID" : "OFF");
	}
}

function setBusModeStripMutes(vm: Voicemeeter, controller: XTouchController) {
	for (let i = 0; i < 8; i++) {
		const curState = Math.floor(vm.parameters.Strip(i).Mute.get());
		console.log("SBMSM", i, curState);
		controller.channel(i + 1).setButton("MUTE", curState === 1 ? "SOLID" : "OFF");
	}
}

function setBusNameLcds(vm: Voicemeeter, controller: XTouchController) {
	// const busLabel = vm.parameters.Bus(selectedBus).device.name.get();
	const busLabel = busNames[selectedBus];
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
	// controller.channel(1).setScreen("TOP", busLabel);
}

let connected = true;
function attachDisconnectHandler() {
	usb.on("detach", (device: usb.Device) => {
		if (
			device.deviceDescriptor.idVendor === 5015 &&
			device.deviceDescriptor.idProduct === 177
		) {
			// We disconnected an xtouch
			connected = false;
			process.exit(0);
		}
	});
}

async function run() {
	const vm = await Voicemeeter.init();
	const controller = new XTouchController();

	attachDisconnectHandler();

	// Connect to your voicemeeter client
	vm.connect();
	attachExitHandler(vm);

	// Set up on start
	checkStripFaders(vm, controller);
	setLcds(vm, controller);

	// Set bus mode on as default
	controller.right().setControlButton("Busses", "SOLID");

	// Sets gain of strips 1-8 based on fade events
	let fadeTimeouts: Record<number, NodeJS.Timeout | null> = {};

	controller.on("fade", async (key) => {
		console.log(`Fade: ${key.channel} - ${key.value}`);
		const dbValue = convertToDB(key.value);
		console.log(dbValue);
		if (key.channel === 9) {
			// Use the 9th output fader for the selected bus
			if (fadeTimeouts[key.channel]) {
				clearTimeout(fadeTimeouts[key.channel]!);
			}

			fadeTimeouts[key.channel] = setTimeout(() => {
				controller.channel(key.channel).setFader(key.value);
				fadeTimeouts[key.channel] = null;
			}, 300); // Adjust the delay as needed

			// Set the bus gain
			await vm.parameters.Bus(selectedBus).Gain.set(dbValue);
			console.log(`Bus Gain: ${dbValue}`);
		} else {
			// Use 1-8 faders for strip
			await vm.parameters.Strip(key.channel - 1).Gain.set(dbValue);

			if (fadeTimeouts[key.channel]) {
				clearTimeout(fadeTimeouts[key.channel]!);
			}

			fadeTimeouts[key.channel] = setTimeout(() => {
				controller.channel(key.channel).setFader(key.value);
				fadeTimeouts[key.channel] = null;
			}, 300); // Adjust the delay as needed
		}
	});

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
	controller.on("channelAction", async (e) => {
		console.log("Channel Action", e);
		if (e.state === "keyDown") {
			switch (e.action) {
				case "select": {
					if (functionMode === "BUSSES") {
						// Handle sends from input strips to busses in both voicemeeter and the controller
						const bus = selectedBus;
						const vmInChannel = e.channel - 1;
						const vmBusName = VoicemeeterChannelNames[
							bus
						] as keyof typeof VoicemeeterChannelNames;

						const curState = Math.floor(
							vm.parameters
								.Strip(vmInChannel)
								[vmBusName].get()
						);

						let newState = 0;
						if (curState === 0) newState = 1; // If 0 then 1 and if 1 stay 0

						vm.parameters
							.Strip(vmInChannel)
							[vmBusName].set(newState);
						controller
							.channel(e.channel)
							.setButton(
								"SEL",
								newState === 1 ? "SOLID" : "OFF"
							);
					}
					break;
				}
				case "mute": {
					if (functionMode === "BUSSES") {
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
							vm.parameters
								.Strip(vmInChannel)
								.Mute.set(1);
							controller
								.channel(e.channel)
								.setButton("MUTE", "SOLID");
						} else {
							// Was muted, unmute and wait for keyUp (state = true and time set) to test for PTT
							pttStates[e.channel].time = dayjs();
							pttStates[e.channel].state = true;
							vm.parameters
								.Strip(vmInChannel)
								.Mute.set(0);
							controller
								.channel(e.channel)
								.setButton("MUTE", "BLINK");
						}
					}
					break;
				}
			}
		}

		if (e.state === "keyUp") {
			switch (e.action) {
				case "mute": {
					// Handling muting/unmuting
					if (functionMode === "BUSSES") {
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
						if (
							isMuted === false &&
							pttStates[e.channel].state === true
						) {
							// Was muted on keyDown and now is unmuted, state is true so we should check for ptt
							const newTime = dayjs();
							const oldTime = pttStates[e.channel].time;
							const diffTime = newTime.diff(
								oldTime,
								"millisecond"
							);
							if (diffTime > 750) {
								// The button was held for more than 3/4th of a second
								// PTT -> Remute
								pttStates[e.channel].state = false;
								vm.parameters
									.Strip(vmInChannel)
									.Mute.set(1);
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
	});

	controller.on("keyDown", async (key) => {
		console.log(`Key Down: ${key.action} - ${key.state}`);

		// Start handle function layers
		const functionMap = {
			BUSSES: (index: number) => {
				selectBus(vm, index);
				hasBusSelected = true;
				lastSelectedBus = selectedBus;
				selectedBus = index;
				setBusNameLcds(vm, controller);
				setBusSends(vm, controller);
				setBusModeStripMutes(vm, controller);
				console.log(`Bus ${index + 1} Selected`);
			},
			OUTPUTS: (index: number) => {
				console.log(`Output ${index + 1} Selected`);
				// Add logic for OUTPUTS mode here
			},
			INPUTS: (index: number) => {
				console.log(`Input ${index + 1} Selected`);
				// Add logic for INPUTS mode here
			},
		};

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
				setBusLeds(controller, key.action as ControlType);
				functionMap[functionMode]?.(index);
				checkStripFaders(vm, controller);
			}
		}

		if (key.action === "Busses") {
			functionMode = "BUSSES";
			setControlLEDs(controller, key.action as ControlType);
			setBusSends(vm, controller);
			setBusModeStripMutes(vm, controller);
			console.log("Function Mode: BUSSES");
		} else if (key.action === "Outputs") {
			functionMode = "OUTPUTS";
			setControlLEDs(controller, key.action as ControlType);
			console.log("Function Mode: OUTPUTS");
		} else if (key.action === "Inputs") {
			functionMode = "INPUTS";
			setControlLEDs(controller, key.action as ControlType);
			console.log("Function Mode: INPUTS");
		}
		// End handle function layers
	});

	vm.attachChangeEvent(() => {
		console.log("Voicemeeter sent change event!");
		checkStripFaders(vm, controller);
		setLcds(vm, controller);
		if (functionMode === "BUSSES") setBusModeStripMutes(vm, controller);
	});

	const vuType = 1;
	while (connected) {
		// Update VU Meters
		for (let channel = 0; channel < 8; channel++) {
			let meterState = 0;
			let vuMeterL = 0;
			let vuMeterR = 0;

			if (channel < 5) {
				// Channels 0-4: use stereo L/R
				const vChannel = channel * 2;
				vuMeterL = vm.getLevel(vuType, vChannel);
				vuMeterR = vm.getLevel(vuType, vChannel + 1);
				meterState = Math.max(vuMeterL, vuMeterR);
			} else {
				// Channels 5-7: use 8 levels and take the highest
				const vChannel = 10 + (channel - 5) * 8;
				let maxLevel = 0;
				for (let i = 0; i < 8; i++) {
					const level = vm.getLevel(vuType, vChannel + i);
					if (level > maxLevel) maxLevel = level;
				}
				meterState = maxLevel;
				vuMeterL = meterState;
				vuMeterR = meterState;
			}

			const mappedValue = Math.round(
				Math.max(0, Math.min(8, Math.pow(meterState, 0.5) * 8))
			);

			controller.channel(channel + 1).setMeter(mappedValue);
			// console.log(
			// 	`Setting c${channel + 1} to ${mappedValue} with vC${vChannel}/vC${
			// 		vChannel + 1
			// 	} as ${vuMeterL}/${vuMeterR}`
			// );
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}
// run();

let hasXTouch = false;
function checkForUSB(device?: usb.Device): boolean {
	if (hasXTouch) return false;

	if (device) {
		if (
			device.deviceDescriptor.idVendor === 5015 &&
			device.deviceDescriptor.idProduct === 177
		) {
			// We have an xtouch
			hasXTouch = true;
			return true;
		}
	} else {
		for (const device of usb.getDeviceList()) {
			if (
				device.deviceDescriptor.idVendor === 5015 &&
				device.deviceDescriptor.idProduct === 177
			) {
				// We have an xtouch
				hasXTouch = true;
				return true;
			}
		}
	}

	return false;
}

if (checkForUSB()) {
	run();
	console.log("XTouch USB Found!");
} else {
	console.log("No XTouch USB Found, adding attach listener!");
	usb.on("attach", (device: usb.Device) => {
		if (checkForUSB(device)) {
			console.log("XTouch USB Found!");
			run();
		}
	});
}

/*
    {
    busNumber: 1,
    deviceAddress: 20,
    deviceDescriptor: {
      bLength: 18,
      bDescriptorType: 1,
      bcdUSB: 512,
      bDeviceClass: 0,
      bDeviceSubClass: 0,
      bDeviceProtocol: 0,
      bMaxPacketSize0: 64,
      idVendor: 5015,
      idProduct: 177,
      bcdDevice: 290,
      iManufacturer: 1,
      iProduct: 2,
      iSerialNumber: 3,
      bNumConfigurations: 1
    },
    portNumbers: [ 7, 3 ]
  },
*/
