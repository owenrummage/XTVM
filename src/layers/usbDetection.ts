import XTouchControl from "xtouch-control";
import { getActiveLayers, loadLayers, setController, stopLayer } from "..";
import { BaseLayer } from "../globals";
import { reset } from "../helpers/xtReset";
import { usb } from "usb";

let connected = true;
let oldActiveLayers: BaseLayer[];

function isXTouch(device: usb.Device) {
	return (
		device.deviceDescriptor.idVendor === 5015 &&
		device.deviceDescriptor.idProduct === 177
	);
}

async function disconnectHandler(device: usb.Device) {
	if (isXTouch(device)) {
		connected = false;
		oldActiveLayers = await stopActiveLayers();
	}
}

function connectHandler(device: usb.Device) {
	if (isXTouch(device) && !connected) {
		setTimeout(async () => {
			setController(new XTouchControl());
			loadLayers();
		}, 5000);
	}
}

async function stopActiveLayers(): Promise<BaseLayer[]> {
	console.log("Stopping all layers!");
	const activeLayers = [...getActiveLayers()];
	console.log(activeLayers, activeLayers.length);

	for await (const layer of activeLayers) {
		if (layer.name !== "USB Detection") stopLayer(layer);
	}

	reset();
	console.log("Layers still active:", getActiveLayers());
	return activeLayers;
}

const layer: BaseLayer = {
	name: "USB Detection",
	activator: "launch",
	start: () => {
		console.log("Starting USB Detection!");
		usb.on("attach", connectHandler);
		usb.on("detach", disconnectHandler);
	},
	stop: () => {
		console.log("Stopping USB Detection!");
		usb.removeListener("attach", connectHandler);
		usb.removeListener("detach", disconnectHandler);
	},
};

export default layer;

/*
    {
    busNumber: 1,
    deviceAddress: 20,
    deviceDescriptor: {
      bLength: 18,
      bDescriptorType: 1,
      bcdUSB: 512,
      bDeviceClass: 0,
      bDeviceSubClass: 0,
      bDeviceProtocol: 0,
      bMaxPacketSize0: 64,
      idVendor: 5015,
      idProduct: 177,
      bcdDevice: 290,
      iManufacturer: 1,
      iProduct: 2,
      iSerialNumber: 3,
      bNumConfigurations: 1
    },
    portNumbers: [ 7, 3 ]
  },
*/
