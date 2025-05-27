import { controller, vm } from "..";
import { checkLeftFaders, checkMainFader } from "./vmFaderChecks";
import { convertToDB } from "./vmHelpers";

/*
This can be used to map fader inputs to voicemeeter strips/busses
To use this first setFaderTypes() then add the fadeListener
*/

export enum FADER_TYPES {
	BUS,
	STRIP,
}

let leftFadersType: FADER_TYPES;
let mainFaderType: FADER_TYPES;
let mainFaderChannel: number;
let configuredChecks: boolean = false;

export function setFaderTypes(
	leftFadersTypeIn: FADER_TYPES,
	mainFadertypeIn: FADER_TYPES,
	mainFaderChannelIn: number,
	configuredChecksIn = false
) {
	leftFadersType = leftFadersTypeIn;
	mainFaderType = mainFadertypeIn;
	mainFaderChannel = mainFaderChannelIn;

	configuredChecks = configuredChecksIn;
}

async function setVMFaderByType(type: FADER_TYPES, channel: number, value: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return await vm.parameters.Bus(channel).Gain.set(value);
		case FADER_TYPES.STRIP:
			return await vm.parameters.Strip(channel).Gain.set(value);
	}
}

let fadeTimeouts: Record<number, NodeJS.Timeout | null> = {};
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

export function runConfiguredFaderChecks() {
	checkLeftFaders(leftFadersType);
	checkMainFader(mainFaderType, mainFaderChannel);
}

export function setupVMFadeInputListener(
	leftFadersTypeIn: FADER_TYPES,
	mainFadertypeIn: FADER_TYPES,
	mainFaderChannelIn: number,
	configuredChecksIn = false
) {
	setFaderTypes(leftFadersTypeIn, mainFadertypeIn, mainFaderChannelIn, configuredChecksIn);
	controller.addListener("fade", fadeListener);
}

export function takeDownVMFadeInputListener() {
	controller.removeListener("fade", fadeListener);
}
