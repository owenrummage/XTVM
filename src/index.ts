// Utilities
import fs from "fs";
import path from "path";
// Core Imports
import url from "url";
import { Voicemeeter } from "voicemeeter-connector";
import XTouchControl from "xtouch-control";
import { BaseLayer } from "./globals";
import { EventEmitter } from "stream";
import { reset } from "./helpers/xtReset";

export { config } from "./config";

let controller: XTouchControl;
let vm: Voicemeeter;

let activeLayer: number;
export let activeLayers: BaseLayer[] = [];

export function startLayer(layer: BaseLayer) {
	activeLayers.push(layer);
	layer.start();
	return activeLayers.indexOf(layer);
}

export function stopLayer(layer: BaseLayer) {
	const index = activeLayers.indexOf(layer);
	if (index > -1) activeLayers.splice(index, 1);

	layer.stop();
}

export function getActiveLayers() {
	return activeLayers;
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

export const vmEventEmitter = new EventEmitter();

export async function loadLayers() {
	// Standard layers
	const layersDir = path.resolve(__dirname, "./layers");
	const layerFiles = fs.readdirSync(layersDir).filter((file) => file.endsWith(".ts"));

	for (const file of layerFiles) {
		const layerPath = path.join(layersDir, file);
		import(url.pathToFileURL(layerPath).href)
			.then((layer) => {
				if (layer.default) {
					const newLayer = layer.default as BaseLayer;
					console.log(`Layer: ${file} loaded`);
					console.log(newLayer);

					if (newLayer.activator.startsWith("button:")) {
						console.log(
							`Layer: ${file} has activator: ${newLayer.activator}`
						);
						const button = newLayer.activator.split(":")[1];
						controller.on("keyDown", (key) => {
							if (key.action == button) {
								if (
									newLayer.name ===
									activeLayers[activeLayer]
										?.name
								)
									return;

								if (
									activeLayer &&
									activeLayers[activeLayer]
								) {
									stopLayer(
										activeLayers[
											activeLayer
										]
									);
								}

								console.log(
									`Button ${button} pressed, activating layer ${newLayer.name}`
								);

								reset();

								activeLayer = startLayer(newLayer);
							}
						});
					} else if (newLayer.activator === "launch") {
						startLayer(newLayer);
					}
				} else {
					console.log(`Layer: ${file} not loaded`);
				}
			})
			.catch((err) => {
				console.error(`Failed to load layer: ${file}`, err);
			});
	}
}

async function run() {
	controller = new XTouchControl();
	vm = await Voicemeeter.init();

	vm.connect();
	attachExitHandler(vm);

	vm.attachChangeEvent(() => {
		vmEventEmitter.emit("change");
	});

	await loadLayers();
}

run();

export { controller, vm };
