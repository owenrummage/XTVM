import { controller } from "..";
import { selectBus } from "./voicemeeter/helpers";

export function reset() {
	for (let i = 1; i < 9; i++) {
		controller.channel(i).setButton("MUTE", "OFF");
		controller.channel(i).setButton("REC", "OFF");
		controller.channel(i).setButton("SEL", "OFF");
		controller.channel(i).setButton("SOLO", "OFF");
		controller.channel(i).setFader(0);
	}
	controller.channel(9).setFader(0);

	selectBus();

	controller.right().setControlButton("Inputs", "OFF");
	controller.right().setControlButton("Busses", "OFF");
	controller.right().setControlButton("Outputs", "OFF");
	controller.right().setControlButton("User", "OFF");

	controller.screens().setScreens("");
}
