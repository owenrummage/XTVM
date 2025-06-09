import { controller, vm } from "../..";
import { FADER_TYPES, VoicemeeterChannelNames } from "./constantsAndTypes";

export function setSends(type: FADER_TYPES, channel: number) {
	switch (type) {
		case FADER_TYPES.STRIP:
			for (let i = 0; i < 8; i++) {
				const vmBusName = VoicemeeterChannelNames[
					channel
				] as keyof typeof VoicemeeterChannelNames;
				const curState = Math.floor(
					vm.parameters.Strip(i)[vmBusName].get()
				);
				controller
					.channel(i + 1)
					.setButton("SEL", curState === 1 ? "SOLID" : "OFF");
			}
			break;

		case FADER_TYPES.BUS:
			// Channel is the current selected BUS
			// I should be the strip for the bus
			for (let i = 0; i < 8; i++) {
				const vmBusName = VoicemeeterChannelNames[
					i
				] as keyof typeof VoicemeeterChannelNames;
				const curState = Math.floor(
					vm.parameters.Strip(channel)[vmBusName].get()
				);
				controller
					.channel(i + 1)
					.setButton("SEL", curState === 1 ? "SOLID" : "OFF");
			}
			break;
	}
}

export function buildSendListener(selectedFunction: () => number, type: FADER_TYPES) {
	return function sendListener(e) {
		console.log("Channel Action", e);
		if (e.state === "keyDown" && e.action === "select") {
			// Handle sends from input strips to busses in both voicemeeter and the controller
			let bus = selectedFunction();
			let vmInChannel = e.channel - 1;

			if (type === FADER_TYPES.BUS) {
				// selectedFunction() is the current selected BUS
				// I should be the strip for the bus
				bus = e.channel - 1;
				vmInChannel = selectedFunction();
			}

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
		}
	};
}
