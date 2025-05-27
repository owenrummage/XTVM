import { controller, vm } from "..";
import { checkLeftFaders, checkMainFader } from "./vmFaderChecks";
import { convertToDB } from "./vmHelpers";
import { FADER_TYPES } from "./voicemeeterConstantsAndTypes";

/*
This can be used to map fader inputs to voicemeeter strips/busses
To use this first setFaderTypes() then add the fadeListener
*/

// Configured fader types and main fader channel variables
let leftFadersType: FADER_TYPES;
let mainFaderType: FADER_TYPES;
let mainFaderChannel: number;

// Set configured variables
export function setFaderTypes(
	leftFadersTypeIn: FADER_TYPES,
	mainFadertypeIn: FADER_TYPES,
	mainFaderChannelIn: number
) {
	leftFadersType = leftFadersTypeIn;
	mainFaderType = mainFadertypeIn;
	mainFaderChannel = mainFaderChannelIn;
}

// Small function to expose the configured fader type
export function getLeftFadersType() {
	return leftFadersType;
}

// Internal setVMFaderByType
async function setVMFaderByType(type: FADER_TYPES, channel: number, value: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return await vm.parameters.Bus(channel).Gain.set(value);
		case FADER_TYPES.STRIP:
			return await vm.parameters.Strip(channel).Gain.set(value);
	}
}

let fadeTimeouts: Record<number, NodeJS.Timeout | null> = {};
// Internal Fade Listener
async function fadeListener(key) {
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

		// Set the main fader gain
		await setVMFaderByType(mainFaderType, mainFaderChannel, dbValue);
		console.log(`Main Gain: ${dbValue}`);
	} else {
		// Use 1-8 faders
		await setVMFaderByType(leftFadersType, key.channel - 1, dbValue);

		if (fadeTimeouts[key.channel]) {
			clearTimeout(fadeTimeouts[key.channel]!);
		}

		fadeTimeouts[key.channel] = setTimeout(() => {
			controller.channel(key.channel).setFader(key.value);
			fadeTimeouts[key.channel] = null;
		}, 300); // Adjust the delay as needed
	}
}

// Run fader checks based on configured values
export function runConfiguredFaderChecks() {
	checkLeftFaders(leftFadersType);
	checkMainFader(mainFaderType, mainFaderChannel);
}

// Setup fader mappings for both listener and checks
export function setupVMFadeInputListener(
	leftFadersTypeIn: FADER_TYPES,
	mainFadertypeIn: FADER_TYPES,
	mainFaderChannelIn: number
) {
	setFaderTypes(leftFadersTypeIn, mainFadertypeIn, mainFaderChannelIn);
	controller.addListener("fade", fadeListener);
}

// Remove fader listener
export function takeDownVMFadeInputListener() {
	controller.removeListener("fade", fadeListener);
}
