/*
This file represents an example configuration of XTVM.
Please copy this file to config.ts and edit the values.
*/
export const config = {
	vuType: 1,
	hass: {
		// Config for user mode to control light power, dimming, and RGB with home assistant
		baseURL: "http://homeassistant.local:8123/api/",
		token: "SECRET TOKEN HERE (Do not include Bearer )",
		light1: {
			entity_id: "light.light", // The Entity ID of a dimmable/rgb light device
		},
	},
};
