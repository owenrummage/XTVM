import dayjs from "dayjs";
import { controller, vm } from "../..";
import { getLeftFadersType } from "./fadeListener";
import { FADER_TYPES } from "./constantsAndTypes";

function getMuteByType(type: FADER_TYPES, channel: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return vm.parameters.Bus(channel).Mute.get();
		case FADER_TYPES.STRIP:
			return vm.parameters.Strip(channel).Mute.get();
	}
}

async function setMuteByType(type: FADER_TYPES, channel: number, value: number) {
	switch (type) {
		case FADER_TYPES.BUS:
			return await vm.parameters.Bus(channel).Mute.set(value);
		case FADER_TYPES.STRIP:
			return await vm.parameters.Strip(channel).Mute.set(value);
	}
}

export function setMuteButtonLeds() {
	for (let i = 0; i < 8; i++) {
		if (pttStates[i + 1].state === true) return;

		const curState = Math.floor(getMuteByType(getLeftFadersType(), i));
		controller.channel(i + 1).setButton("MUTE", curState === 1 ? "SOLID" : "OFF");
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

export function muteChannelActionListener(e) {
	if (e.action !== "mute") return;

	const lft = getLeftFadersType();

	if (e.state === "keyDown") {
		// Handling muting/unmuting
		const vmInChannel = e.channel - 1;
		const isMutedNumber = Math.floor(getMuteByType(lft, vmInChannel));
		const isMuted = isMutedNumber === 1 ? true : false;
		console.log(e.channel, "Muted:", isMuted);
		if (isMuted === false) {
			// Was not muted, mute
			pttStates[e.channel].actionRunning = true;
			setMuteByType(lft, vmInChannel, 1);
			controller.channel(e.channel).setButton("MUTE", "SOLID");
		} else {
			// Was muted, unmute and wait for keyUp (state = true and time set) to test for PTT
			pttStates[e.channel].time = dayjs();
			pttStates[e.channel].state = true;
			setMuteByType(lft, vmInChannel, 0);
			controller.channel(e.channel).setButton("MUTE", "BLINK");
		}
	}

	if (e.state === "keyUp") {
		// Handling muting/unmuting
		const vmInChannel = e.channel - 1;
		const isMutedNumber = Math.floor(getMuteByType(lft, vmInChannel));
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
				setMuteByType(lft, vmInChannel, 1);
				controller.channel(e.channel).setButton("MUTE", "SOLID");
			} else {
				// No ptt, stay unmuted
				controller.channel(e.channel).setButton("MUTE", "OFF");
			}
		}
	}
}
