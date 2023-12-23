import { z } from "zod";

import { entityTypeSchema, queryKeySchema } from "../../types";

// tmp schemas from dcsjs
const Schema = {
	coalition: z.enum(["blue", "red", "neutrals"]),
	position: z.object({ x: z.number(), y: z.number() }),
	task: z.enum(["DEAD", "AWACS", "CAP", "Escort", "Pinpoint Strike", "CAS", "CSAR", "Air Assault"]),
	structureType: z.enum([
		"Ammo Depot",
		"Farp",
		"Command Center",
		"Power Plant",
		"Fuel Storage",
		"Hospital",
		"Prison",
		"Barrack",
		"Depot",
	]),
};

const entitySchema = z.object({
	serialized: z.literal(true),
	entityType: entityTypeSchema,
	id: z.string(),
	coalition: Schema.coalition,
	queries: z.array(queryKeySchema),
});
export type EntitySerialized = z.TypeOf<typeof entitySchema>;

const groupSchema = entitySchema.extend({
	position: Schema.position,
});
export type GroupSerialized = z.TypeOf<typeof groupSchema>;

const mapEntitySchema = entitySchema.extend({
	position: Schema.position,
});
export type MapEntitySerialized = z.TypeOf<typeof mapEntitySchema>;

const structureSchema = mapEntitySchema.extend({
	name: z.string(),
	structureType: Schema.structureType,
	objectiveId: z.string(),
});
export type StructureSerialized = z.TypeOf<typeof structureSchema>;

const genericStructureSchema = structureSchema.extend({
	entityType: z.literal("GenericStructure"),
});
export type GenericStructureSerialized = z.TypeOf<typeof genericStructureSchema>;

const packageSchema = entitySchema.extend({
	entityType: z.literal("Package"),
	task: Schema.task,
	cruiseSpeed: z.number(),
	flightGroupIds: z.array(z.string()),
});
export type PackageSerialized = z.TypeOf<typeof packageSchema>;

export const stateSchema = z.object({
	entities: z.array(z.discriminatedUnion("entityType", [genericStructureSchema, packageSchema])),
});
export type StateSerialized = z.TypeOf<typeof stateSchema>;