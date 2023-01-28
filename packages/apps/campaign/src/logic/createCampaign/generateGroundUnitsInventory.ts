import * as DcsJs from "@foxdelta2/dcsjs";
import { Faction } from "@kilcekru/dcc-shared-rpc-types";
import { createUniqueId } from "solid-js";

import { firstItem } from "../../utils";

export const generateGroundUnitsInventory = (faction: Faction) => {
	const vehicleName = firstItem(faction.vehicles);

	if (vehicleName == null) {
		throw "vehicle not found";
	}

	const vehicle: DcsJs.CampaignUnit = {
		id: "",
		name: vehicleName,
		displayName: vehicleName,
		alive: true,
		category: "Armor",
		state: "idle",
		vehicleTypes: ["Armored"],
	};

	const infantryName = firstItem(faction.infantries);

	if (infantryName == null) {
		throw "vehicle not found";
	}

	const infantry: DcsJs.CampaignUnit = {
		id: "",
		name: infantryName,
		displayName: infantryName,
		alive: true,
		category: "Infantry",
		state: "idle",
		vehicleTypes: [],
	};

	const groundUnits: Record<string, DcsJs.CampaignUnit> = {};
	Array.from({ length: 40 }, () => {
		const id = createUniqueId();

		groundUnits[id] = {
			...vehicle,
			id,
			displayName: `${vehicle.name}|${id}`,
		};
	});

	Array.from({ length: 40 }, () => {
		const id = createUniqueId();

		groundUnits[id] = {
			...infantry,
			id,
			displayName: `${infantry.name}|${id}`,
		};
	});

	return groundUnits;
};
