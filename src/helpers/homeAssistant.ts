import { config } from "..";

export async function postRequest(url: string, data: object) {
	console.log(
		await fetch(config.hass.baseURL + url, {
			credentials: "include",
			headers: {
				Authorization: "Bearer " + config.hass.token,
				"Content-Type": "application/json",
			},
			method: "POST",
			mode: "cors",
			body: JSON.stringify(data),
		}).then((res) => res.json())
	);
}

export async function getState(entity_id: string) {
	return await fetch(config.hass.baseURL + "states/" + entity_id, {
		credentials: "include",
		headers: {
			Authorization: "Bearer " + config.hass.token,
			"Content-Type": "application/json",
		},
	}).then((res) => res.json());
}
