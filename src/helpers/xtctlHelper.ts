import { controller } from "..";

export function clearTopScreens() {
	controller.screens().setScreensArray(["", "", "", "", "", "", "", ""]);
}
