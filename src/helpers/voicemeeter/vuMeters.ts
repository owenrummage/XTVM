import { config, controller, vm } from "../..";

let vuMeterTaskInterval: NodeJS.Timeout;

export function vuMeterStripsTask(active: boolean) {
	if (active) {
		// Start task
		vuMeterTaskInterval = setInterval(() => {
			for (let channel = 0; channel < 8; channel++) {
				let meterState = 0;
				let vuMeterL = 0;
				let vuMeterR = 0;

				if (channel < 5) {
					// Channels 0-4: use stereo L/R
					const vChannel = channel * 2;
					vuMeterL = vm.getLevel(
						config.vuType as 0 | 1 | 2 | 3,
						vChannel
					);
					vuMeterR = vm.getLevel(
						config.vuType as 0 | 1 | 2 | 3,
						vChannel + 1
					);
					meterState = Math.max(vuMeterL, vuMeterR);
				} else {
					// Channels 5-7: use 8 levels and take the highest
					const vChannel = 10 + (channel - 5) * 8;
					let maxLevel = 0;
					for (let i = 0; i < 8; i++) {
						const level = vm.getLevel(
							config.vuType as 0 | 1 | 2 | 3,
							vChannel + i
						);
						if (level > maxLevel) maxLevel = level;
					}
					meterState = maxLevel;
					vuMeterL = meterState;
					vuMeterR = meterState;
				}

				const mappedValue = Math.round(
					Math.max(0, Math.min(8, Math.pow(meterState, 0.5) * 8))
				);

				controller.channel(channel + 1).setMeter(mappedValue);
				// console.log(
				// 	`Setting c${channel + 1} to ${mappedValue} with vC${vChannel}/vC${
				// 		vChannel + 1
				// 	} as ${vuMeterL}/${vuMeterR}`
				// );
			}
		}, 10);
	} else if (vuMeterTaskInterval) {
		// Stop task
		clearInterval(vuMeterTaskInterval);
	}
}

export function vuMeterBusesTask(active: boolean) {
	if (active) {
		// Start task
		vuMeterTaskInterval = setInterval(() => {
			for (let channel = 0; channel < 8; channel++) {
				let meterState = 0;

				// Use 8 levels and take the highest
				const vChannel = channel * 8;
				let maxLevel = 0;
				for (let i = 0; i < 8; i++) {
					const level = vm.getLevel(3, vChannel + i);
					if (level > maxLevel) maxLevel = level;
				}
				meterState = maxLevel;

				const mappedValue = Math.round(
					Math.max(0, Math.min(8, Math.pow(meterState, 0.5) * 8))
				);

				controller.channel(channel + 1).setMeter(mappedValue);
				// console.log(
				// 	`Setting BUS c${
				// 		channel + 1
				// 	} to ${mappedValue} with vC${vChannel}-vC${
				// 		vChannel + 7
				// 	} as ${meterState}`
				// );
			}
		}, 10);
	} else if (vuMeterTaskInterval) {
		// Stop task
		clearInterval(vuMeterTaskInterval);
	}
}
