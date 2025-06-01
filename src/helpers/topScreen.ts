import { controller } from "..";
import { clearTopScreens } from "./xtctlHelper";

let currentMode = "layer";
const modes: Record<string, string[] | false> = {};

export function setTopScreen(text: string[], mode_string: string) {
	modes[mode_string] = text;
	if (mode_string === currentMode) selectTopScreenMode(mode_string);
}

export function selectTopScreenMode(mode_string: string) {
	clearTopScreens();
	currentMode = mode_string;
	if (modes[mode_string]) {
		controller.screens().setScreensArray(modes[mode_string], 0);
	}
}

export function setAndSelectTopScreen(text: string[], mode_string: string) {
	currentMode = mode_string;
	setTopScreen(text, mode_string);
}
