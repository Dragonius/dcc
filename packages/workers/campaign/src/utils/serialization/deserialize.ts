import * as Types from "@kilcekru/dcc-shared-types";

import {
	AirAssaultFlightGroup,
	Aircraft,
	Airdrome,
	Building,
	CapFlightGroup,
	CasFlightGroup,
	CsarFlightGroup,
	DeadFlightGroup,
	DownedPilot,
	EscortFlightGroup,
	Farp,
	Flightplan,
	GenericStructure,
	GroundGroup,
	GroundUnit,
	Objective,
	Package,
	SAM,
	SeadFlightGroup,
	StrikeFlightGroup,
	UnitCamp,
} from "../../ecs/entities";
const entityClasses = {
	AirAssaultFlightGroup,
	Aircraft,
	Airdrome,
	CapFlightGroup,
	CasFlightGroup,
	CsarFlightGroup,
	DeadFlightGroup,
	DownedPilot,
	EscortFlightGroup,
	Farp,
	GenericStructure,
	GroundGroup,
	GroundUnit,
	Objective,
	Package,
	SeadFlightGroup,
	StrikeFlightGroup,
	UnitCamp,
	Building,
	Flightplan,
	SAM,
};

export function deserialize(serialized: unknown) {
	const parsed = Types.Serialization.stateSchema.parse(serialized);

	const res = [];

	for (const entity of parsed.entities) {
		// If are error with property missing, make sure the missing class is imported and in the entityClasses object
		const entityClass = entityClasses[entity.entityType] as { deserialize: (entity: unknown) => void }; // TODO
		res.push(entityClass.deserialize(entity));
	}

	// only returned to test on console
	return res;
}

self.deserialize = deserialize;
