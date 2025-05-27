import { config, controller, vm } from "..";
import { BaseLayer } from "../globals";
import { getState, goveeMqtt, postRequest } from "../helpers/homeAssistant";
import { convertToPercent } from "../helpers/voicemeeter/helpers";

const sfl = true; // Sets standard where every input is a http call or keyed where every fader release is a http call

let updateInterval: NodeJS.Timeout;
let curState = false;
let lastBrightness = 0;
let brightness = 0;
let kflState = 0;
let rgb = [0, 0, 0];
let lastrgb = rgb;

let activeChangeTimeout: NodeJS.Timeout;
let activeChange = false;

function midiToBrightness(midiValue: number): number {
	return Math.round((midiValue / 127) * 255);
}

function brightnessToMidi(brightness: number): number {
	return Math.round((brightness / 255) * 127);
}

async function update() {
	if (activeChange) return;

	const state = await getState(config.hass.light1.entity_id);

	if (state.state === "on") {
		curState = true;
		controller.channel(1).setButton("MUTE", "OFF");

		brightness = state.attributes.brightness as number;

		rgb = state.attributes.rgb_color;
		if (lastrgb[0] !== rgb[0]) controller.channel(2).setFader(brightnessToMidi(rgb[0]));
		if (lastrgb[1] !== rgb[1]) controller.channel(3).setFader(brightnessToMidi(rgb[1]));
		if (lastrgb[2] !== rgb[2]) controller.channel(4).setFader(brightnessToMidi(rgb[2]));
		lastrgb = rgb;
	} else if (state.state === "off") {
		curState = false;
		controller.channel(1).setButton("MUTE", "SOLID");

		brightness = 0;
	}

	if (brightness !== lastBrightness)
		controller.channel(1).setFader(brightnessToMidi(brightness));

	lastBrightness = brightness;
}

async function channelActionListener(e) {
	console.log("Channel Action", e);
	if (e.state === "keyDown") {
		switch (e.action) {
			case "mute": {
				// Handling muting/unmuting
				if (e.channel === 1) {
					postRequest("services/light/toggle", {
						entity_id: config.hass.light1.entity_id,
					});
					update();
				}
				break;
			}
		}
	} else if (e.state === "keyUp") {
		switch (e.action) {
			case "104": {
				if (!sfl) {
					brightness = midiToBrightness(kflState);

					// await postRequest("services/light/turn_on", {
					// 	entity_id: config.hass.light1.entity_id,
					// 	brightness,
					// });

					goveeMqtt(config.hass.light1.commandTopic, {
						brightness,
					});

					update();
				}
				break;
			}
			case "105":
			case "106":
			case "107": {
				// RGB Change
				console.log("Sending RGB Change:", rgb);

				// await postRequest("services/light/turn_on", {
				// 	entity_id: config.hass.light1.entity_id,
				// 	rgb_color: rgb,
				// });

				goveeMqtt(config.hass.light1.commandTopic, {
					color: {
						r: rgb[0],
						g: rgb[1],
						b: rgb[2],
					},
				});

				clearTimeout(activeChangeTimeout);
				activeChangeTimeout = setTimeout(() => {
					console.log("Clearing Change Lock");
					activeChange = false;
					update();
				}, 5000);

				break;
			}
		}
	}
}

async function checkRGBFader(key) {
	if (key.channel === 2) {
		activeChange = true;
		controller.channel(2).setFader(key.value);
		rgb[0] = midiToBrightness(key.value);
	}
	if (key.channel === 3) {
		activeChange = true;
		controller.channel(3).setFader(key.value);
		rgb[1] = midiToBrightness(key.value);
	}
	if (key.channel === 4) {
		activeChange = true;
		controller.channel(4).setFader(key.value);
		rgb[2] = midiToBrightness(key.value);
	}

	lastrgb = rgb;
}

async function standardFadeListener(key) {
	console.log(`Fade: ${key.channel} - ${key.value}`);
	if (key.channel === 1) {
		controller.channel(1).setFader(key.value);

		brightness = midiToBrightness(key.value);

		activeChange = true;

		// await postRequest("services/light/turn_on", {
		// 	entity_id: config.hass.light1.entity_id,
		// 	brightness,
		// });

		if (brightness !== lastBrightness)
			goveeMqtt(config.hass.light1.commandTopic, {
				brightness: Math.round(
					convertToPercent(brightnessToMidi(brightness))
				),
			});

		lastBrightness = brightness;

		clearTimeout(activeChangeTimeout);
		activeChangeTimeout = setTimeout(() => {
			console.log("Clearing Change Lock");
			activeChange = false;
			update();
		}, 5000);
	}
	checkRGBFader(key);
}

async function keyedFadeListener(key) {
	console.log(`Fade: ${key.channel} - ${key.value}`);
	if (key.channel === 1) {
		controller.channel(1).setFader(key.value);
		kflState = key.value;
	}
	checkRGBFader(key);
}

function start() {
	controller.right().setControlButton("User", "SOLID");
	controller.addListener("channelAction", channelActionListener);
	if (sfl) controller.addListener("fade", standardFadeListener);
	else controller.addListener("fade", keyedFadeListener);

	lastrgb = [0, 0, 0];
	lastBrightness = -1;
	activeChange = false;
	update();

	updateInterval = setInterval(update, 500);
}

function stop() {
	controller.right().setControlButton("User", "OFF");
	controller.removeListener("channelAction", channelActionListener);

	if (sfl) controller.removeListener("fade", standardFadeListener);
	else controller.removeListener("fade", keyedFadeListener);

	clearTimeout(activeChangeTimeout);
	activeChange = false;

	clearInterval(updateInterval);
}

const layer: BaseLayer = {
	name: "User",
	activator: "button:NoneUser",
	start,
	stop,
};

export default layer;
