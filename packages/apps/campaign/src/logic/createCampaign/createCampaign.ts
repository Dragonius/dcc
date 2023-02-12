import * as DcsJs from "@foxdelta2/dcsjs";
import { CampaignState, DataStore } from "@kilcekru/dcc-shared-rpc-types";
import { createUniqueId } from "solid-js";

import { factionList } from "../../data";
import { scenarioList } from "../../data/scenarios";
import { firstItem, Minutes, random } from "../../utils";
import { addEWs } from "./addEWs";
import { generateAircraftInventory } from "./generateAircraftInventory";
import { generateGroundUnitsInventory } from "./generateGroundUnitsInventory";
import { generateSams } from "./generateSams";

/**
 *
 * @param state will be mutated
 * @returns
 */
export const createCampaign = (
	state: CampaignState,
	dataStore: DataStore,
	blueFactionName: string,
	redFactionName: string
) => {
	const scenario = firstItem(scenarioList);
	const blueBaseFaction = factionList.find((f) => f.name === blueFactionName);

	if (scenario == null) {
		throw "unknown scenario";
	}

	if (blueBaseFaction == null) {
		throw "unknown faction: " + blueFactionName;
	}

	const firstBlueAirdrome = dataStore.airdromes?.[(firstItem(scenario.blue.airdromeNames) ?? "") as DcsJs.AirdromeName];

	if (firstBlueAirdrome == null) {
		throw "unknown airdrome";
	}

	const blueSams = generateSams("blue", blueBaseFaction, dataStore, scenario);

	state.blueFaction = {
		...blueBaseFaction,
		countryName: blueBaseFaction.countryName as DcsJs.CountryName,
		airdromeNames: scenario.blue.airdromeNames as DcsJs.AirdromeName[],
		inventory: {
			aircrafts: generateAircraftInventory("blue", blueBaseFaction, scenario, dataStore),
			groundUnits: generateGroundUnitsInventory(blueBaseFaction, "blue", scenario),
		},
		packages: [],
		sams: blueSams,
		groundGroups: [],
		reinforcementTimer: state.timer,
		reinforcementDelay: Minutes(30),
		awacsFrequency: 285.0,
		downedPilots: [],
		ews: [], // will be filled with addEWs()
	};

	const redBaseFaction = factionList.find((f) => f.name === redFactionName);

	if (redBaseFaction == null) {
		throw "unknown faction: " + blueFactionName;
	}

	state.redFaction = {
		...redBaseFaction,
		countryName: redBaseFaction.countryName as DcsJs.CountryName,
		airdromeNames: scenario.red.airdromeNames as DcsJs.AirdromeName[],

		inventory: {
			aircrafts: generateAircraftInventory("red", redBaseFaction, scenario, dataStore),
			groundUnits: generateGroundUnitsInventory(redBaseFaction, "red", scenario),
		},
		packages: [],
		sams: generateSams("red", redBaseFaction, dataStore, scenario),
		groundGroups: [],
		reinforcementTimer: state.timer,
		reinforcementDelay: Minutes(30),
		awacsFrequency: 280.0,
		downedPilots: [],
		ews: [], // will be filled with addEWs()
	};

	state.objectives =
		dataStore.objectives?.reduce((prev, dataObjective) => {
			const isBlue = scenario.blue.objectiveNames.some((name) => name === dataObjective.name);
			const faction = isBlue ? state.blueFaction : state.redFaction;

			if (faction == null) {
				return prev;
			}

			const inventory = faction.inventory;
			const groupType = random(1, 100) > 40 ? "armor" : "infantry";
			const units = Object.values(inventory.groundUnits)
				.filter((unit) => unit.category !== "Air Defence")
				.filter((unit) => {
					if (groupType === "infantry") {
						return unit.category === "Infantry" && unit.state === "idle";
					} else {
						return unit.category !== "Infantry" && unit.state === "idle";
					}
				})
				.slice(0, random(4, 8));

			if (groupType === "armor") {
				const airDefenceUnits = Object.values(inventory.groundUnits).filter(
					(unit) => unit.vehicleTypes.find((vt) => vt === "SHORAD") && unit.state === "idle"
				);
				const count = random(0, 2);

				const selectedADUnits = airDefenceUnits.slice(0, count);

				selectedADUnits.forEach((unit) => units.push(unit));
			}

			const structures = dataStore.strikeTargets?.[dataObjective.name]?.filter((target) => target.type === "Structure");

			const objective: DcsJs.CampaignObjective = {
				name: dataObjective.name,
				position: dataObjective.position,
				structures:
					structures?.map((structure) => ({
						id: createUniqueId(),
						name: structure.name,
						position: structure.position,
						unitPositions: structure.unitPositions,
						groupId: structure.groupId,
						objectiveName: structure.objectiveName,
						alive: true,
					})) ?? [],
				coalition: isBlue ? "blue" : "red",
				deploymentDelay: isBlue ? Minutes(30) : Minutes(60),
				deploymentTimer: state.timer,
				incomingGroundGroups: {},
			};

			const vehicleTargets = dataStore.strikeTargets?.[dataObjective.name]?.filter(
				(target) => target.type === "Vehicle"
			);

			if ((vehicleTargets?.length ?? 0) > 0) {
				units.forEach((unit) => {
					const inventoryUnit = inventory.groundUnits[unit.id];

					if (inventoryUnit == null) {
						console.error("inventory ground unit not found", unit.id); // eslint-disable-line no-console
						return;
					}

					inventoryUnit.state = "on objective";
				});

				faction.groundGroups.push({
					id: createUniqueId(),
					objective,
					startObjective: objective,
					position: objective.position,
					state: "on objective",
					unitIds: units.map((u) => u.id),
					startTime: state.timer,
					groupType,
				});
			}

			prev[objective.name] = objective;
			return prev;
		}, {} as Record<string, DcsJs.CampaignObjective>) ?? {};

	addEWs(state, scenario);

	state.active = true;
	state.farps = [
		...scenario.blue.farpNames.map((name) => ({ coalition: "blue" as DcsJs.CampaignCoalition, name })),
		...scenario.red.farpNames.map((name) => ({ coalition: "red" as DcsJs.CampaignCoalition, name })),
	];

	return state;
};