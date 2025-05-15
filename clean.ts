import XTouchController from "xtouch-control";

const controller = new XTouchController();
const channels = Array.from({ length: 9 }, (_, i) => i + 1);
const waveLength = 50; // Number of steps in the wave
let step = 0;

function waveValue(step: number, channel: number): number {
	// Create a phase offset for each channel
	const phase = (2 * Math.PI * (channel - 1)) / channels.length;
	// Sine wave between 0 and 127
	return Math.round((Math.sin((step / waveLength) * 2 * Math.PI + phase) + 1) * 63.5);
}

setInterval(() => {
	channels.forEach((channel) => {
		const value = waveValue(step, channel);
		controller.channel(channel).setFader(value);
	});
	step = (step + 1) % waveLength;
}, 8);
