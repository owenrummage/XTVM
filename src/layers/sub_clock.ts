import { controller, vm } from "..";
import { BaseLayer } from "../globals";

import dayjs from "dayjs";

function setTime() {
	const currentTime = dayjs();
	let timeSection = "A";
	let hour = currentTime.hour();
	const minute = currentTime.minute();
	const second = currentTime.second();

	if (hour > 12) {
		hour -= 12;
		timeSection = "P";
	}

	const hourText = hour.toString().padStart(2, "0").split("");
	const minuteText = minute.toString().padStart(2, "0").split("");
	const secondText = second.toString().padStart(2, "0").split("");

	controller.right().setTimecodeDisplay(2, timeSection); // A/P
	controller.right().setTimecodeDisplay(3, secondText[1]); // Seconds 2
	controller.right().setTimecodeDisplay(4, secondText[0]); // Seconds 1
	controller.right().setTimecodeDisplay(5, minuteText[1], true); // Minutes 2
	controller.right().setTimecodeDisplay(6, minuteText[0]); // Minutes 1
	controller.right().setTimecodeDisplay(7, hourText[1], true); // Hours 2
	controller.right().setTimecodeDisplay(8, hourText[0]); // Hours 1
}

let interval: NodeJS.Timeout;

const layer: BaseLayer = {
	name: "Clock",
	activator: "launch",
	start: () => {
		interval = setInterval(setTime, 500);
	},
	stop: () => {
		clearInterval(interval);
	},
};

export default layer;
