// Utilities
import fs from "fs";
import path from "path";
// Core Imports
import url from "url";
import { Voicemeeter } from "voicemeeter-connector";
import XTouchControl from "xtouch-control";
import { BaseLayer } from "./globals";

let controller: XTouchControl;
let vm: Voicemeeter;

// Make me a function that will get all files in the src/layers directory and import them one by one and console.log their defaut export

let activeLayer: BaseLayer;

async function run() {
	controller = new XTouchControl();
	vm = await Voicemeeter.init();

	vm.connect();

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
								activeLayer?.stop();
								console.log(
									`Button ${button} pressed, activating layer ${newLayer.name}`
								);
								activeLayer = newLayer;
								newLayer.start();
							}
						});
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

run();

export { controller, vm };
