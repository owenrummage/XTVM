import { vm } from "../..";
import { setTopScreen } from "../topScreen";
import { clearTopScreens } from "../xtctlHelper";
import { FADER_TYPES } from "./constantsAndTypes";
import { setBottomLabelLCDs } from "./helpers";

type VMFTContextType = (selectedBus: number) => {
	Label: {
		get: () => string;
	};
};

export function setTopScreenVMLabel(type: FADER_TYPES, selectedBus: number) {
	let VMFTContext: VMFTContextType = vm.parameters.Bus;

	if (type === FADER_TYPES.STRIP) VMFTContext = vm.parameters.Strip;

	const busLabel = VMFTContext(selectedBus).Label.get();
	const words = busLabel.split(" ");
	const busLabelWords: string[] = [];

	for (const word of words) {
		if (word.length <= 7) {
			busLabelWords.push(word);
		} else {
			let start = 0;
			while (start < word.length) {
				busLabelWords.push(word.substring(start, start + 7));
				start += 7;
			}
		}
	}

	clearTopScreens();
	setTopScreen(busLabelWords.slice(0, 8), "layer");
	setBottomLabelLCDs();
}
