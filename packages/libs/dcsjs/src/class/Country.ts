import * as Data from "../data";
import { AwacsFlightGroup } from "./AwacsFlightGroup";
import { CapFlightGroup } from "./CapFlightGroup";
import { CasFlightGroup } from "./CasFlightGroup";
import { DeadFlightGroup } from "./DeadFlightGroup";
import { EscortFlightGroup } from "./EscortFlightGroup";
import { FlightGroup, FlightGroupUnit } from "./FlightGroup";
import { GroundGroup, GroundGroupUnit } from "./GroundGroup";
import { JtacFlightGroup } from "./JtacFlightGroup";
import type { Mission } from "./Mission";
import { SamGroup } from "./SamGroup";
import { SeadFlightGroup } from "./SeadFlightGroup";
import { StaticGroup } from "./StaticGroup";
import { StrikeFlightGroup } from "./StrikeFlightGroup";
import {
	isCapFlightGroup,
	isCasFlightGroup,
	isDeadFlightGroup,
	isEscortFlightGroup,
	isSeadFlightGroup,
	isStrikeFlightGroup,
} from "./typeGuards";

interface CountryProps {
	id: number;
	name: Data.CountryName;
}

export class Country {
	readonly id: number;
	readonly name: Data.CountryName;
	#groundGroups: GroundGroup[] = [];
	#staticGroups: StaticGroup[] = [];
	#samGroups: SamGroup[] = [];
	#plane: FlightGroup[] = [];
	#helicopter: FlightGroup[] = [];

	get staticGroups() {
		return this.#staticGroups;
	}

	get flightGroups() {
		return [...this.#plane, ...this.#helicopter];
	}

	get groundGroups() {
		return [...this.#groundGroups, ...this.#samGroups];
	}

	constructor(args: CountryProps) {
		this.id = args.id;
		this.name = args.name;
	}

	public createGroundGroup(args: Data.InputTypes.GroundGroup, mission: Mission) {
		const id = mission.nextGroupId;

		const units: GroundGroupUnit[] = [];

		for (const unit of args.units) {
			const unitId = mission.nextUnitId;

			units.push({
				name: unit.name,
				type: unit.type,
				unitId,
			});
		}

		const gg = new GroundGroup({
			...args,
			groupId: id,
			units,
		});

		this.#groundGroups.push(gg);
	}

	public createSamGroup(args: Data.InputTypes.SamGroup, mission: Mission) {
		const id = mission.nextGroupId;
		const units: GroundGroupUnit[] = [];

		for (const unit of args.units) {
			const unitId = mission.nextUnitId;

			units.push({
				name: unit.name,
				type: unit.type,
				unitId,
			});
		}

		const sg = new SamGroup({
			...args,
			groupId: id,
			units,
		});

		this.#samGroups.push(sg);
	}

	public createStaticGroup(args: Data.InputTypes.StaticGroup, mission: Mission) {
		for (const building of args.units) {
			const id = mission.nextGroupId;
			const unitId = mission.nextUnitId;

			const sg = new StaticGroup({
				...args,
				position: building.position,
				groupId: id,
				unitId,
				buildingName: building.name,
				buildingType: building.type,
			});

			this.#staticGroups.push(sg);
		}
	}

	public createFlightGroup(args: Data.InputTypes.FlightGroup, mission: Mission) {
		const id = mission.nextGroupId;
		let isHelicopter = false;
		const units: FlightGroupUnit[] = [];

		for (const unit of args.units) {
			const unitId = mission.nextUnitId;
			const aircraftData = Data.aircraftDefinitions[unit.type];

			if (aircraftData.isHelicopter === true) {
				isHelicopter = true;
			}

			units.push({
				...unit,
				unitId,
			});
		}

		let fg: FlightGroup;

		if (isStrikeFlightGroup(args)) {
			fg = new StrikeFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		} else if (isCasFlightGroup(args)) {
			let jtac: JtacFlightGroup | undefined = undefined;
			if (args.hasClients) {
				jtac = new JtacFlightGroup(args, mission);
				this.#plane.push(jtac);
			}

			fg = new CasFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
				jtac,
			});
		} else if (isCapFlightGroup(args)) {
			fg = new CapFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		} else if (isEscortFlightGroup(args)) {
			fg = new EscortFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		} else if (isDeadFlightGroup(args)) {
			fg = new DeadFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		} else if (isSeadFlightGroup(args)) {
			fg = new SeadFlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		} else {
			// eslint-disable-next-line no-console
			console.log("Country: No special flight group", args.task);
			fg = new FlightGroup({
				...args,
				groupId: id,
				units,
				isHelicopter,
			});
		}

		if (isHelicopter === true) {
			this.#helicopter.push(fg);
		} else {
			this.#plane.push(fg);
		}
	}

	public generateAWACS(coalition: Data.Coalition, aircraftType: Data.AircraftType, mission: Mission) {
		const fg = new AwacsFlightGroup({
			coalition,
			aircraftType,
			countryName: this.name,
			mission,
		});

		this.#plane.push(fg);
	}

	public toGenerated(mission: Mission): Data.GeneratedTypes.Country {
		return {
			id: this.id,
			name: this.name,
			plane: {
				group: this.#plane.map((fg) => fg.toGenerated(mission)),
			},
			helicopter: {
				group: this.#helicopter.map((fg) => fg.toGenerated(mission)),
			},
			vehicle: {
				group: [
					...this.#groundGroups.map((gg) => gg.toGenerated(mission)),
					...this.#samGroups.map((sg) => sg.toGenerated(mission)),
				],
			},
			static: {
				group: this.#staticGroups.map((sg) => sg.toGenerated(mission)),
			},
		};
	}
}
