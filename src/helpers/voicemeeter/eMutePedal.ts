import { vm } from "../..";

let faderStates: Record<number, number> = {
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

export function eMuteChannelActionListener(e) {
	if (e.action !== "pedal1") return;

	if (e.state === "keyUp") {
		for (let channel = 0; channel < 8; channel++) {
			faderStates[channel] = vm.parameters.Bus(channel).Mute.get();
			vm.parameters.Bus(channel).Mute.set(1);
		}
	}

	if (e.state === "keyDown") {
		for (let channel = 0; channel < 8; channel++) {
			vm.parameters.Bus(channel).Mute.set(faderStates[channel]);
		}
	}
}
