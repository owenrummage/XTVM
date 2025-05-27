import { config } from "..";
import mqtt from "mqtt";

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

export const mqttClient = mqtt.connect(config.hass.mqtt.broker, config.hass.mqtt.options);
mqttClient.subscribe(config.hass.light1.stateTopic);
export async function goveeMqtt(commandTopic: string, data: any) {
	if (!data.state) {
		data.state = "ON";
	}
	mqttClient.publish(commandTopic, JSON.stringify(data));
}
