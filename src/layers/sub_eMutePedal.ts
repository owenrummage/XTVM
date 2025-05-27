import { controller } from "..";
import { BaseLayer } from "../globals";
import { eMuteChannelActionListener } from "../helpers/voicemeeter/eMutePedal";

const layer: BaseLayer = {
	name: "EMutePedal",
	activator: "launch",
	start: () => {
		controller.addListener("channelAction", eMuteChannelActionListener);
	},
	stop: () => {
		controller.removeListener("channelAction", eMuteChannelActionListener);
	},
};

export default layer;
