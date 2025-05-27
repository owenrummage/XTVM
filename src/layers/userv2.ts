import { LineType } from "xtouch-control";
import { config, controller, vm } from "..";
import { BaseLayer } from "../globals";
import { getState, goveeMqtt, mqttClient, postRequest } from "../helpers/homeAssistant";

let curState = false;
let brightnessPercent = 0;
let lastBrightnessPercent = brightnessPercent;

let r = 0;
let g = 0;
let b = 0;

function midiToRGB(midiValue: number): number {
	return Math.round((midiValue / 127) * 255);
}

function rgbToMidi(brightness: number): number {
	return Math.round((brightness / 255) * 127);
}

function midiToBrightnessPercent(midiValue: number): number {
	return Math.round((midiValue / 127) * 100);
}

function brightnessPercentToMidi(percent: number): number {
	return Math.round((percent / 100) * 127);
}

function setRGBScreens(lt: LineType = "BOTTOM") {
	controller.channel(2).setScreen(lt, r.toString());
	controller.channel(3).setScreen(lt, g.toString());
	controller.channel(4).setScreen(lt, b.toString());
}

function setRGBFaders() {
	controller.channel(2).setFader(rgbToMidi(r));
	controller.channel(3).setFader(rgbToMidi(g));
	controller.channel(4).setFader(rgbToMidi(b));
}

function sendRGB() {
	setRGBScreens();

	goveeMqtt(config.hass.light1.commandTopic, {
		color: {
			r,
			g,
			b,
		},
	});
}

function setBrightnessFade(lt: LineType = "BOTTOM") {
	controller.channel(1).setFader(brightnessPercentToMidi(brightnessPercent));
	controller.channel(1).setScreen(lt, brightnessPercent.toString());
}

async function updateFromHass() {
	const state = await getState(config.hass.light1.entity_id);

	if (state.state === "on") {
		curState = true;
		controller.channel(1).setButton("MUTE", "OFF");

		const rgb = state.attributes.rgb_color;

		r = rgb[0];
		g = rgb[1];
		b = rgb[2];

		setRGBFaders();
		sendRGB();
	} else if (state.state === "off") {
		curState = false;
		controller.channel(1).setButton("MUTE", "SOLID");
	}
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
				}
				break;
			}
		}
	} else if (e.state === "keyUp") {
		switch (e.action) {
			case "105":
			case "106":
			case "107": {
				// RGB Change
				console.log("Sending RGB Change:", r, g, b);

				sendRGB();

				break;
			}
		}
	}
}

async function checkRGBFader(key) {
	if (key.channel === 2) {
		r = midiToRGB(key.value);
	}
	if (key.channel === 3) {
		g = midiToRGB(key.value);
	}
	if (key.channel === 4) {
		b = midiToRGB(key.value);
	}

	setRGBFaders();
	setRGBScreens("TOP");
}

async function standardFadeListener(key) {
	console.log(`Fade: ${key.channel} - ${key.value}`);
	if (key.channel === 1) {
		brightnessPercent = midiToBrightnessPercent(key.value);
		setBrightnessFade("TOP");

		if (brightnessPercent !== lastBrightnessPercent)
			goveeMqtt(config.hass.light1.commandTopic, {
				brightness: brightnessPercent,
			});

		lastBrightnessPercent = brightnessPercent;
	}
	checkRGBFader(key);
}

function mqttStateChange(topic: string, e: Buffer<ArrayBufferLike>) {
	if (topic !== config.hass.light1.stateTopic) return;
	const data = JSON.parse(e.toString());
	console.log(data);

	if (data.brightness) {
		brightnessPercent = data.brightness;
		lastBrightnessPercent = brightnessPercent;
	}

	if (data.state === "ON") {
		curState = true;
		controller.channel(1).setButton("MUTE", "OFF");
	} else if (data.state === "OFF") {
		curState = false;
		controller.channel(1).setButton("MUTE", "SOLID");
	}

	setBrightnessFade();

	if (data.color) {
		r = data.color.r;
		g = data.color.g;
		b = data.color.b;
	}

	setRGBFaders();
}

function start() {
	controller.right().setControlButton("User", "SOLID");
	controller.addListener("channelAction", channelActionListener);
	controller.addListener("fade", standardFadeListener);

	mqttClient.on("message", mqttStateChange);

	lastBrightnessPercent = -1;

	updateFromHass();
}

function stop() {
	controller.right().setControlButton("User", "OFF");
	controller.removeListener("channelAction", channelActionListener);
	controller.removeListener("fade", standardFadeListener);

	mqttClient.removeListener("message", mqttStateChange);
}

const layer: BaseLayer = {
	name: "User",
	activator: "button:User",
	start,
	stop,
};

export default layer;
