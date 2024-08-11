import { Mission } from "./class";
import { CapFlightGroup } from "./class/CapFlightGroup";
import { CasFlightGroup } from "./class/CasFlightGroup";
import { DeadFlightGroup } from "./class/DeadFlightGroup";
import { EscortFlightGroup } from "./class/EscortFlightGroup";
import { FlightGroup } from "./class/FlightGroup";
import { JtacFlightGroup } from "./class/JtacFlightGroup";
import { SeadFlightGroup } from "./class/SeadFlightGroup";
import { StrikeFlightGroup } from "./class/StrikeFlightGroup";
import * as Types from "./data";
import * as Data from "./data";
import { FlightGroupUnit } from "./data/inputTypes";

export const random = (min: number, max: number): number => {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

export function randomPosition(sourcePosition: Types.Position, radius: number) {
	const xR = random(radius * -1, radius);
	const yR = random(radius * -1, radius);

	return {
		x: sourcePosition.x + xR,
		y: sourcePosition.y + yR,
	};
}

export const randomItem = <T>(arr: Array<T>, filterFn?: (value: T) => boolean): T | undefined => {
	const filtered = filterFn == null ? arr : [...arr].filter(filterFn);

	return filtered[random(0, filtered.length - 1)];
};

export const msTimeToDcsTime = (msTime: number): number => {
	return msTime / 1000;
};

export const Minutes = (value: number) => {
	return value * 60 * 1000;
};

export const oppositionCoalition = (coalition: Types.Coalition): Types.Coalition => {
	return coalition === "blue" ? "red" : "blue";
};

export function addPropAircraft(
	unit: FlightGroupUnit,
	groupIndex: number,
	mission: Mission,
): Record<string, string | number | boolean> | undefined {
	const aircraftDefinition = Data.aircraftDefinitions[unit.type];

	const prop = structuredClone(aircraftDefinition.AddPropAircraft);

	if (prop == null) {
		return {};
	}

	if (prop["STN_L16"] != null) {
		prop["STN_L16"] = mission.nextSTN_L16.toString().padStart(5, "0");
	}

	if (prop["VoiceCallsignNumber"] != null) {
		if (typeof unit.callsign === "object") {
			prop["VoiceCallsignNumber"] = unit.callsign["3"].toString() + (groupIndex + 1).toString();
			prop["VoiceCallsignLabel"] = (
				(unit.callsign.name[0] ?? "E") + (unit.callsign.name[unit.callsign.name.length - 3] ?? "D")
			).toUpperCase();
		} else {
			prop["VoiceCallsignNumber"] = unit.callsign.toString() + (groupIndex + 1).toString();
			prop["VoiceCallsignLabel"] = "ED";
		}
	}

	return prop;
}

export function addRadio(unit: FlightGroupUnit, frequencies: Types.GroupFrequencies) {
	if (unit.isClient) {
		switch (unit.type) {
			/* case "F-16C_50": {
				return [
					{
						channels: [
							305, 264, 265, 256, 254, 250, 270, 257, 255, 262, 259, 268, 269, 260, 263, 261, 267, 251, 253, 266,
						],
						modulations: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						channelsNames: {},
					},
					{
						channels: [
							127, 135, 136, 127, 125, 121, 141, 128, 126, 133, 130, 139, 140, 131, 134, 132, 138, 122, 124, 137,
						],
						modulations: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						channelsNames: {},
					},
				];
			} */
			default: {
				return [
					{
						channels: [
							frequencies.package,
							frequencies.airdrome ?? 300,
							frequencies.awacs,
							frequencies.jtac ?? 126.5,
							127,
							129,
							131,
							133,
							141,
							250.5,
							251,
							253,
							254,
							257,
							260,
							261,
							262,
							263,
							267,
							270,
						],
						modulations: {},
						channelsNames: {},
					},
					{
						channels: [
							225, 230, 240, 250.5, 251, 256, 257, 262, 263, 267, 270, 254, 264, 266, 265, 252, 268, 271, 275, 360,
						],
						modulations: {},
						channelsNames: {},
					},
				];
			}
		}
	}

	return undefined;
}

export function addDatalinks(unitType: Data.AircraftType, groupIndex: number, teamMembers: object[]) {
	const aircraftDefinition = Data.aircraftDefinitions[unitType];

	if (aircraftDefinition.datalinks == null) {
		return undefined;
	}

	switch (unitType) {
		case "F-16C_50": {
			return {
				Link16: {
					settings: {
						...aircraftDefinition.datalinks.Link16.settings,
						flightLead: groupIndex === 0,
					},
					network: {
						teamMembers,
						donors: {},
					},
				},
			};
		}
		default: {
			return undefined;
		}
	}
}

export function routePointTask(taskActions: Array<Types.RoutePointTaskTemplate>): Types.GeneratedTypes.RoutePointTask {
	return {
		id: "ComboTask",
		params: {
			tasks: mapTaskActionsNumber(taskActions),
		},
	};
}

export function mapTaskActionsNumber(
	taskActions: Array<Types.RoutePointTaskTemplate>,
): Array<Types.GeneratedTypes.RoutePointTaskAction> {
	return taskActions.map((ta, i) => {
		return {
			...ta,
			number: i + 1,
		};
	});
}

function startFlightGroupTasks(flightGroup: FlightGroup, training: boolean) {
	const tasks: Array<Types.RoutePointTaskTemplate> = [];

	tasks.push(Data.TaskAction.noContactRadio);
	tasks.push(Data.TaskAction.evadeFire);
	tasks.push(Data.TaskAction.rtbOnBingo);

	switch (flightGroup.task) {
		case "AWACS": {
			tasks.push(Data.TaskAction.Invisible);
			tasks.push(Data.TaskAction.Immortal);
			tasks.push(Data.TaskAction.AWACS);
			tasks.push(Data.TaskAction.EPLRS);

			break;
		}
		case "CAP": {
			if (!training) {
				tasks.push(Data.TaskAction.WeaponFree);
			}
		}
	}

	switch (flightGroup.task) {
		case "CAP":
		case "Escort": {
			if (!training) {
				tasks.push(Data.TaskAction["Missile AttackRange"]);
			}
		}
	}

	if (training) {
		tasks.push(Data.TaskAction.WeaponHold);
	}

	return tasks;
}

export const flightGroupTasks = ({ flightGroup, mission }: { flightGroup: FlightGroup; mission: Mission }) => {
	const tasks: Array<Types.RoutePointTaskTemplate> = [];

	switch (flightGroup.task) {
		case "AFAC": {
			if (flightGroup instanceof JtacFlightGroup) {
				const targetGG = getTargetGroundGroup(flightGroup.target, mission);

				if (targetGG == null) {
					tasks.push(Data.TaskAction.AFAC);
					break;
				}

				tasks.push(Data.TaskAction.FAC_AttackGroup(targetGG.groupId, flightGroup.frequency));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for AFAC Task");
			}

			break;
		}
		case "CAS": {
			if (flightGroup instanceof CasFlightGroup) {
				tasks.push(Data.TaskAction.CAS_EngageTargetsInZone(flightGroup.target.position));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for CAS Task");
			}

			break;
		}
		case "CAP": {
			tasks.push(Data.TaskAction.WeaponDesignate);

			if (flightGroup instanceof CapFlightGroup) {
				tasks.push(Data.TaskAction.CAP_EngageTargetsInZone(flightGroup.position));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for CAP Task");
			}

			break;
		}
		case "AWACS": {
			tasks.push(Data.TaskAction.AWACS);

			break;
		}
		case "SEAD": {
			if (flightGroup instanceof SeadFlightGroup) {
				const target = getTargetFlightGroup(flightGroup.target, mission);

				if (target == null) {
					break;
				}

				tasks.push(Data.TaskAction.SEADEscort(target.groupId));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for SEAD Task");
			}

			break;
		}
		case "DEAD": {
			if (flightGroup instanceof DeadFlightGroup) {
				tasks.push(Data.TaskAction.CAS_EngageTargetsInZone(flightGroup.target.position));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for DEAD Task");
			}

			break;
		}
		case "Pinpoint Strike": {
			if (flightGroup instanceof StrikeFlightGroup) {
				const target = flightGroup.target;

				target.units.forEach((building) => {
					tasks.push(Data.TaskAction.Bombing(building.position));
				});

				tasks.push(Data.TaskAction.SwitchWaypoint(3, 5));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for Pinpoint Strike Task");
			}

			break;
		}
		case "Escort": {
			if (flightGroup instanceof EscortFlightGroup) {
				const target = getTargetFlightGroup(flightGroup.target, mission);

				if (target == null) {
					break;
				}

				tasks.push(Data.TaskAction.Escort(target.groupId));
			} else {
				// eslint-disable-next-line no-console
				console.warn("Invalid Flight Group Class for Escort Task");
			}

			break;
		}
	}

	return tasks;
};

export function getStartWaypointTasks(
	flightGroup: FlightGroup,
	training: boolean,
): Array<Types.RoutePointTaskTemplate> {
	const tasks = startFlightGroupTasks(flightGroup, training);

	return tasks;
}

export const callSign = (aircraftType: Types.AircraftType, type: "aircraft" | "awacs") => {
	const callSigns = type === "aircraft" ? Data.callsigns : Data.AWACSCallsigns;

	const aircraftCallsigns = Data.aircraftDefinitions[aircraftType].customCallsigns;

	if (aircraftCallsigns != null) {
		for (const cs of aircraftCallsigns) {
			callSigns.push(cs);
		}
	}

	if (callSigns == null) {
		return {
			name: "Enfield",
			index: 1,
		};
	}
	const selected = randomItem(callSigns) ?? "Enfield";

	return {
		name: selected,
		index: (callSigns.indexOf(selected) ?? 1) + 1,
	};
};

export function getTargetGroundGroup(target: Data.InputTypes.GroundGroup, mission: Mission) {
	const country = mission.getCountry(target.countryName);

	if (country == null) {
		// eslint-disable-next-line no-console
		console.error("Country not found", target);
		return;
	}

	const group = country.groundGroups.find((gg) => gg.name === target.name);

	if (group == null) {
		// eslint-disable-next-line no-console
		console.error("Ground group not found", target);

		return;
	}

	return group;
}

export function getTargetFlightGroup(target: Data.InputTypes.FlightGroup, mission: Mission) {
	const country = mission.getCoalitionCountry(target.coalition);

	if (country == null) {
		// eslint-disable-next-line no-console
		console.error("Country not found", target.coalition);
		return;
	}

	const group = country.flightGroups.find((fg) => fg.name === target.name);

	if (group == null) {
		// eslint-disable-next-line no-console
		console.error("Escort Target FG not fround", target);

		return;
	}

	return group;
}
