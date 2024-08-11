import * as z from "zod";

import * as Enums from "./enums";

export namespace Schema {
	export const position = z.object({
		x: z.number(),
		y: z.number(),
	});

	export const weaponBase = z.object({
		name: z.string(),
		displayName: z.string(),
		year: z.number().optional(),
	});

	export const a2AWeapon = z
		.object({
			type: Enums.a2aWeaponType,
			range: z.number(),
			rangeType: Enums.rangeType,
		})
		.merge(weaponBase);

	export const a2GWeapon = z
		.object({
			type: Enums.a2gWeaponType,
			target: Enums.a2gWeaponTarget,
			weight: z.number().optional(),
			highDrag: z.boolean().optional(),
		})
		.merge(weaponBase);

	export const a2GRangeWeapon = z
		.object({
			type: Enums.a2gRangeWeaponType,
			targets: z.array(Enums.a2gWeaponTarget),
			range: z.number(),
		})
		.merge(weaponBase);

	export const weapon = z.union([a2AWeapon, a2GWeapon, a2GRangeWeapon]);

	export const pylon = z.object({
		CLSID: z.string(),
		num: z.number().optional(),
	});

	export const launcher = z.union([
		z.object({
			name: z.string(),
			displayName: z.string(),
			CLSID: z.string(),
			total: z.number(),
			type: z.literal("Weapon"),
			weapon: z.string(),
		}),
		z.object({
			name: z.string(),
			displayName: z.string(),
			CLSID: z.string(),
			total: z.number(),
			type: Enums.launcherType.exclude(["Weapon"]),
		}),
	]);

	export const loadout = z.object({
		task: z.union([Enums.task, z.literal("default")]),
		name: z.string(),
		displayName: z.string(),
		pylons: z.array(pylon),
	});

	export const aircraftDefinition = z.object({
		chaff: z.number(),
		display_name: z.string(),
		flare: z.number(),
		ammo_type: z.number().optional(),
		gun: z.number().optional(),
		max_fuel: z.number(),
		max_height: z.number(),
		max_speed: z.number(),
		name: Enums.aircraftType,
		loadouts: z.array(loadout),
		availableTasks: z.array(Enums.task),
		controllable: z.boolean(),
		maxWaypoints: z.number().optional(),
		isHelicopter: z.boolean().default(false).optional(),
		isMod: z.boolean().default(false).optional(),
		isLarge: z.boolean().default(false).optional(),
		cruiseAltitude: z.number(),
		cruiseSpeed: z.number(),
		era: Enums.era,
		carrierCapable: z.boolean(),
		allowedFrequency: z.tuple([z.number(), z.number()]).optional(),
		customCallsigns: z.array(z.string()).optional(),
		AddPropAircraft: z.record(z.string(), z.string().or(z.number()).or(z.boolean())).optional(),
		datalinks: z
			.object({
				Link16: z.object({
					settings: z.object({}),
				}),
			})
			.optional(),
	});

	export const callsign = z
		.object({
			1: z.number(),
			2: z.number(),
			3: z.number(),
			name: z.string(),
		})
		.or(z.number())
		.or(z.string());

	export const groundUnit = z.object({
		category: z.string(),
		display_name: z.string(),
		name: Enums.groundUnitType,
		playerCanDrive: z.boolean(),
		era: Enums.era.optional(),
		vehicleTypes: z.array(Enums.vehicleType).optional(),
	});

	export const building = z.object({
		category: z.string(),
		shapeName: z.string().optional(),
		type: Enums.buildingType,
	});

	export const country = z.object({
		id: z.number(),
		name: Enums.countryName,
		short_name: z.string(),
	});

	export const airdromeStand = position.extend({
		id: z.string(),
		crossroad_index: z.number(),
		helicopter: z.boolean(),
		large: z.boolean(),
		plane: z.boolean(),
		shelter: z.boolean(),
		blocked: z.boolean().optional(),
	});

	export const airdromeDefinition = position.extend({
		id: z.number(),
		name: z.string(),
		standlist: z.record(z.string(), airdromeStand),
		frequency: z.number().optional(),
		frequencyList: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(), // TODO
		runwayAngle: z.number(),
	});

	export const objective = z.object({
		name: z.string(),
		type: z.string(),
		position,
	});

	export const unitPosition = position.extend({
		heading: z.number(),
	});

	export const target = z.object({
		name: z.string(),
		position,
		blueGroup: z.object({}).optional(), // TODO
		objectiveName: z.string(),
		groupId: z.number(),
		type: Enums.targetType,
		structureType: z.string().optional(),
		structureCategory: z.string().optional(),
		unitPositions: z.array(unitPosition),
	});

	export const theatreData = z.object({
		objectives: z.array(objective),
		targets: z.record(z.string(), z.array(target)),
		airdromeDefinitions: z.record(z.string(), airdromeDefinition),
		info: z.object({
			center: z.object({
				x: z.number(),
				y: z.number(),
			}),
			weather: z.object({
				temperature: z.object({
					amplitude: z.number(),
					mean: z.number(),
				}),
				cloudCover: z.object({
					baseCloudCover: z.number(),
					seasonEffect: z.number(),
				}),
				wind: z.object({
					speed: z.number(),
					direction: z.number(),
				}),
			}),
			night: z.object({
				startHour: z.number(),
				endHour: z.number(),
			}),
		}),
	});

	export const structureBuilding = z.object({
		offset: position,
		type: Enums.buildingType,
	});

	export const groundUnitsTemplate = z.object({
		name: z.string(),
		sams: z.array(Enums.samType),
		vehicles: z.array(Enums.groundUnitType),
		infantries: z.array(Enums.groundUnitType),
		shoradVehicles: z.array(Enums.groundUnitType),
		shoradInfantries: z.array(Enums.groundUnitType),
		ews: z.array(Enums.groundUnitType),
	});

	export const samTemplate = z.object({
		units: z.array(Enums.groundUnitType),
		range: z.number(),
		fireInterval: z.number(),
	});

	export const weather = z.object({
		offset: z.number(),
		temperature: z.number(),
		wind: z.object({
			direction: z.number(),
			speed: z.number(),
		}),
		cloudCover: z.number(),
		cloudCoverData: z.array(z.number()),
	});

	export const triggerRuleRule = z.object({
		predicate: z.literal("c_time_after"),
		seconds: z.number(),
	});

	export const activateGroupAction = z.object({
		predicate: z.literal("a_activate_group"),
		group: z.number(),
	});

	export const doScriptFileAction = z.object({
		predicate: z.literal("a_do_script_file"),
		file: z.string(),
	});

	export const aiTaskAction = z.object({
		predicate: z.literal("a_ai_task"),
		ai_task: z.tuple([z.number(), z.number()]),
	});

	export const outTextDelayAction = z.object({
		predicate: z.literal("a_out_text_delay"),
		seconds: z.number(),
		start_delay: z.number(),
		text: z.string(),
		KeyDict_text: z.string(),
		clearview: z.boolean(),
	});

	export const triggerAction = z.union([activateGroupAction, doScriptFileAction, aiTaskAction, outTextDelayAction]);

	export const triggerRule = z.object({
		rules: z.array(triggerRuleRule),
		actions: z.array(triggerAction),
		predicate: z.union([z.literal("triggerOnce"), z.literal("triggerStart")]),
		comment: z.string(),
	});

	export const triggerType = z.object({
		action: z.string(),
		func: z.string().or(z.null()),
		conditions: z.string(),
		funcStartup: z.string().or(z.null()),
	});

	export const routePointTaskTemplate = z.object({
		enabled: z.boolean(),
		auto: z.boolean(),
		key: z.string().optional(),
		id: z.enum([
			"AWACS",
			"EngageTargets",
			"WrappedAction",
			"Orbit",
			"AttackGroup",
			"Bombing",
			"Escort",
			"SEAD",
			"FireAtPoint",
			"EngageTargetsInZone",
			"EWR",
			"FAC",
			"ControlledTask",
			"FAC_AttackGroup",
		]),
		name: z.string().optional(),
		params: z.object({}),
	});

	export const groupFrequencies = z.object({
		package: z.number(),
		airdrome: z.number().optional(),
		awacs: z.number(),
		jtac: z.number().optional(),
	});
}

export type Position = z.TypeOf<typeof Schema.position>;
export type AircraftDefinition = z.TypeOf<typeof Schema.aircraftDefinition>;
export type Country = z.TypeOf<typeof Schema.country>;
export type GroundUnit = z.TypeOf<typeof Schema.groundUnit>;
export type Loadout = z.TypeOf<typeof Schema.loadout>;
export type Pylon = z.TypeOf<typeof Schema.pylon>;
export type Weapon = z.TypeOf<typeof Schema.weapon>;
export type AirdromeDefinition = z.TypeOf<typeof Schema.airdromeDefinition>;
export type Objective = z.TypeOf<typeof Schema.objective>;
export type Target = z.TypeOf<typeof Schema.target>;
export type TheatreData = z.TypeOf<typeof Schema.theatreData>;
export type Building = z.TypeOf<typeof Schema.building>;
export type Callsign = z.TypeOf<typeof Schema.callsign>;
export type StructureBuilding = z.TypeOf<typeof Schema.structureBuilding>;
export type GroundUnitsTemplate = z.TypeOf<typeof Schema.groundUnitsTemplate>;
export type SamTemplate = z.TypeOf<typeof Schema.samTemplate>;
export type Weather = z.TypeOf<typeof Schema.weather>;
export type A2AWeapon = z.TypeOf<typeof Schema.a2AWeapon>;
export type A2GWeapon = z.TypeOf<typeof Schema.a2GWeapon>;
export type A2GRangeWeapon = z.TypeOf<typeof Schema.a2GRangeWeapon>;
export type Launcher = z.TypeOf<typeof Schema.launcher>;
export type AirdromeStand = z.TypeOf<typeof Schema.airdromeStand>;
export type RoutePointTaskTemplate = z.TypeOf<typeof Schema.routePointTaskTemplate>;
export type TriggerRule = z.TypeOf<typeof Schema.triggerRule>;
export type TriggerType = z.TypeOf<typeof Schema.triggerType>;
export type GroupFrequencies = z.TypeOf<typeof Schema.groupFrequencies>;
