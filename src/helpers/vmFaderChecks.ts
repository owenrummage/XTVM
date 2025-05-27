import { convertFromDB } from "./vmHelpers";
import { controller, vm } from "..";
import { FADER_TYPES } from "./vmFadeListener";

let faderStates: Record<number, number>;

export function resetFaderStates() {
	faderStates = {
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
		7: 0,
		8: 0,
		9: 0,
	};
}
resetFaderStates();

function getVMFaderByType(type: FADER_TYPES, channel: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return Number(vm.parameters.Bus(channel).Gain.get());
		case FADER_TYPES.STRIP:
			return Number(vm.parameters.Strip(channel).Gain.get());
	}
}

// Check if the strip volumes have changed and set the fader if so
export function checkLeftFaders(type = FADER_TYPES.STRIP) {
	for (let i = 0; i < 8; i++) {
		const gain = getVMFaderByType(type, i);
		if (faderStates[i + 1] !== gain) {
			// Changed
			faderStates[i + 1] = gain;
			let newValue = convertFromDB(gain);

			console.log(`Channel ${i + 1} Gain: ${newValue}`);
			controller.channel(i + 1).setFader(newValue);
		}
	}
}

export function checkMainFader(type = FADER_TYPES.BUS, channel: number) {
	const gain = getVMFaderByType(type, channel);
	if (faderStates[9] !== gain) {
		// Changed
		faderStates[9] = gain;
		let newValue = convertFromDB(gain);

		console.log(`Main Channel ${channel + 1} Gain: ${newValue}`);
		controller.channel(9).setFader(newValue);
	}
}
