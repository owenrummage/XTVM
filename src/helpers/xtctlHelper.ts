import { controller } from "..";

export function clearTopScreens() {
	controller.screens().setScreensArray(["", "", "", "", "", "", "", ""]);
}

export function isFKey(key) {
	const regex = /F\d/g;
	return regex.test(key.action);
}
