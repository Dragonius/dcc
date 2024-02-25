import * as DcsJs from "@foxdelta2/dcsjs";
import * as Types from "@kilcekru/dcc-shared-types";
import * as Utils from "@kilcekru/dcc-shared-utils";

import { Events, Serialization } from "../../utils";
import { getEntity, QueryKey } from "../store";
import type { FlightGroup } from "./_base/FlightGroup";
import type { HomeBase } from "./_base/HomeBase";
import { Unit, UnitProps } from "./_base/Unit";
export interface AircraftProps extends Omit<UnitProps, "entityType" | "queries"> {
	aircraftType: DcsJs.AircraftType;
	homeBaseId: Types.Campaign.Id;
}

export type AircraftA2AWeapons = Map<string, { item: DcsJs.A2AWeapon; count: number; total: number }>;

export class Aircraft extends Unit<keyof Events.EventMap.Aircraft> {
	readonly #aircraftType: DcsJs.AircraftType;
	#flightGroupId: Types.Campaign.Id | undefined = undefined;
	#callSign: Types.Serialization.CallSign | undefined = undefined;
	#name: string | undefined = undefined;
	#onboardNumber: number;
	readonly #homeBaseId: Types.Campaign.Id;
	#isClient = false;
	#loadout: Types.Campaign.CampaignLoadout | undefined = undefined;

	get flightGroup(): FlightGroup | undefined {
		if (this.#flightGroupId == null) {
			return undefined;
		}

		return getEntity<FlightGroup>(this.#flightGroupId);
	}

	get loadout() {
		return this.#loadout;
	}

	get aircraftData() {
		const data = DcsJs.aircraftDefinitions[this.#aircraftType];

		if (data == null) {
			throw new Error(`aircraft: ${this.#aircraftType} not found`);
		}

		return data;
	}

	get isHelicopter() {
		return this.aircraftData.isHelicopter;
	}

	get homeBase() {
		return getEntity<HomeBase>(this.#homeBaseId);
	}

	get isClient() {
		return this.#isClient;
	}

	set isClient(value: boolean) {
		this.#isClient = value;
	}

	get callsign() {
		return this.#callSign;
	}

	get name() {
		return this.#name;
	}

	private constructor(args: AircraftProps | Types.Serialization.AircraftSerialized) {
		const superArgs = Serialization.isSerialized(args)
			? args
			: { ...args, entityType: "Aircraft" as const, queries: ["aircrafts-idle"] as QueryKey[] };
		super(superArgs);
		this.#aircraftType = args.aircraftType;
		this.#homeBaseId = args.homeBaseId;

		if (Serialization.isSerialized(args)) {
			this.#callSign = args.callSign;
			this.#name = args.name;
			this.#isClient = args.isClient;
			this.#loadout = args.loadout;
			this.#onboardNumber = args.onboardNumber;
		} else {
			this.#onboardNumber = Utils.Random.number(1, 99);
		}
	}

	public static create(args: AircraftProps) {
		return new Aircraft(args);
	}

	override destructor() {
		this.homeBase.removeAircraft(this);
		super.destructor();
	}

	#addLoadout(task: DcsJs.Task) {
		let loadout = this.aircraftData.loadouts.find((l) => l.task === task);

		if (loadout == null) {
			loadout = this.aircraftData.loadouts.find((l) => l.task === "default");

			if (loadout == null) {
				// eslint-disable-next-line no-console
				throw new Error(`loadout not found for task: ${task} and aircraft: ${this.aircraftData.name}`);
			}
		}

		this.#loadout = {
			...loadout,
			task: task,
			pylons: loadout.pylons.map((pylon): Types.Campaign.CampaignPylon => {
				const launcher = Object.values(DcsJs.launchers).find((l) => pylon.CLSID === l.CLSID);

				if (launcher == null) {
					// eslint-disable-next-line no-console
					throw new Error(`launcher not found for pylon: ${pylon.CLSID}`);
				}

				const weapon = launcher?.type === "Weapon" ? DcsJs.weapons[launcher.weapon] : undefined;

				return {
					CLSID: pylon.CLSID,
					num: pylon.num ?? 0,
					type: launcher.type,
					count: launcher.total,
					total: launcher.total,
					weapon,
				};
			}),
		};
	}

	/**
	 * Returns a map of all air to air weapons on the aircraft
	 *
	 * @returns A amp of all air to air weapons on the aircraft with the current count and total count
	 */
	get a2aWeapons() {
		const weapons: AircraftA2AWeapons = new Map();

		if (this.#loadout == null) {
			return weapons;
		}

		for (const pylon of this.#loadout.pylons) {
			if (pylon.type !== "Weapon") {
				continue;
			}

			if (pylon.weapon == null) {
				continue;
			}

			if (
				pylon.weapon.type !== "infrared" &&
				pylon.weapon.type !== "semi-active radar" &&
				pylon.weapon.type !== "active radar"
			) {
				continue;
			}

			const weapon = weapons.get(pylon.weapon.name);

			if (weapon == null) {
				weapons.set(pylon.weapon.name, { item: pylon.weapon, count: pylon.count, total: pylon.total });
			} else {
				weapon.count += pylon.count;
				weapon.total += pylon.total;
			}
		}

		return weapons;
	}

	/**
	 * Get the maximum range of all air to air range of the aircraft
	 *
	 * @returns The maximum range of all air to air weapons on the aircraft
	 */
	get a2aRange(): number {
		const weapons = this.a2aWeapons;

		let range = 0;

		for (const weapon of weapons.values()) {
			if (weapon.count === 0) {
				continue;
			}

			if (weapon.item.range > range) {
				range = weapon.item.range;
			}
		}

		return range;
	}

	addToFlightGroup(args: {
		id: Types.Campaign.Id;
		task: DcsJs.Task;
		callSign: Types.Serialization.CallSign;
		name: string;
	}) {
		this.#flightGroupId = args.id;
		this.#callSign = args.callSign;
		this.#name = args.name;
		this.#addLoadout(args.task);
		this.moveSubQuery("aircrafts", "idle", "in use");
	}

	override toJSON(): Types.Campaign.AircraftItem {
		return {
			...super.toJSON(),
			aircraftType: this.aircraftData.name,
			homeBaseId: this.#homeBaseId,
			flightGroupId: this.#flightGroupId,
			displayName: this.aircraftData.display_name,
			isClient: this.#isClient,
		};
	}

	static deserialize(args: Types.Serialization.AircraftSerialized) {
		return new Aircraft(args);
	}

	public override serialize(): Types.Serialization.AircraftSerialized {
		return {
			...super.serialize(),
			entityType: "Aircraft",
			aircraftType: this.#aircraftType,
			homeBaseId: this.#homeBaseId,
			callSign: this.#callSign,
			onboardNumber: this.#onboardNumber,
			name: this.#name,
			isClient: this.#isClient,
			loadout: this.#loadout,
		};
	}
}
