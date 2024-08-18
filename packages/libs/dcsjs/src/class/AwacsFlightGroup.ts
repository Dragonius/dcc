import * as Data from "../data";
import { oppositionCoalition } from "../utils";
import { Airdrome } from "./Airdrome";
import { FlightGroup } from "./FlightGroup";
import { Mission } from "./Mission";

export type AwacsFlightGroupProps = {
	coalition: Data.Coalition;
	countryName: Data.CountryName;
	mission: Mission;
	aircraftType: Data.AircraftType;
};

const headingToPosition = (position1: Data.Position, position2: Data.Position) => {
	return Math.round((Math.atan2(position2.y - position1.y, position2.x - position1.x) * 180) / Math.PI);
};

const isPosition = (value: Data.Position | { position: Data.Position }): value is Data.Position => {
	return (value as Data.Position).x != null;
};

const objectToPosition = <T extends Data.Position | { position: Data.Position }>(value: T): Data.Position => {
	if (isPosition(value)) {
		return {
			x: value.x,
			y: value.y,
		};
	} else {
		return value.position;
	}
};

const addHeading = (heading: number, value: number) => {
	let sum = heading + value;

	while (sum < 0) {
		sum += 360;
	}

	return sum % 360;
};
const degreesToRadians = (degrees: number) => {
	// return parseFloat(((degrees * Math.PI) / 180).toFixed(2));
	return (degrees / 360) * 2 * Math.PI;
};
const positionFromHeading = (pos: Data.Position, heading: number, distance: number): Data.Position => {
	let positiveHeading = heading;
	while (positiveHeading < 0) {
		positiveHeading += 360;
	}

	positiveHeading %= 360;

	const radHeading = degreesToRadians(positiveHeading);

	return {
		x: pos.x + Math.cos(radHeading) * distance,
		y: pos.y + Math.sin(radHeading) * distance,
	};
};

export class AwacsFlightGroup extends FlightGroup {
	constructor(args: AwacsFlightGroupProps) {
		let airdrome: Airdrome | undefined = undefined;
		for (const ad of args.mission.airdromes[args.coalition]?.values() ?? []) {
			airdrome = ad;
			break;
		}

		if (airdrome === undefined) {
			throw new Error("No airdrome found");
		}

		const oppCoalition = oppositionCoalition(args.coalition);

		let oppAirdrome: Airdrome | undefined = undefined;
		for (const ad of args.mission.airdromes[oppCoalition]?.values() ?? []) {
			oppAirdrome = ad;
			break;
		}

		if (oppAirdrome === undefined) {
			throw new Error("No opp airdrome found");
		}

		const headingToOppAirdrome = headingToPosition(
			objectToPosition(airdrome.airdromeDefinition),
			objectToPosition(oppAirdrome.airdromeDefinition),
		);

		const awacsHeading = addHeading(headingToOppAirdrome, 180);

		const startPosition = positionFromHeading(objectToPosition(airdrome.airdromeDefinition), awacsHeading, 20000);

		const endPosition = positionFromHeading(objectToPosition(airdrome.airdromeDefinition), awacsHeading, 40000);

		super({
			coalition: args.coalition,
			frequency: 144, // Utils.Config.defaults.awacsFrequency,
			groupId: args.mission.nextGroupId,
			units: [
				{
					name: "AWACS",
					type: args.aircraftType,
					unitId: args.mission.nextUnitId,
					callsign: {
						name: "Magic",
						"1": 1,
						"2": 1,
						"3": 1,
					},
					isClient: false,
					onboardNumber: 111,
					pylons: [],
					heading: awacsHeading,
				},
			],
			isHelicopter: false,
			countryName: args.countryName,
			cruiseSpeed: 389,
			hasClients: false,
			name: `AWACS-${args.coalition}`,
			position: startPosition,
			task: "AWACS",
			homeBaseName: airdrome.airdromeDefinition.name,
			homeBaseType: "Airdrome",
			startTime: args.mission.time - 10000,
			waypoints: [
				{
					arrivalTime: args.mission.time - 10000,
					name: "Take Off",
					onGround: true,
					position: {
						x: airdrome.airdromeDefinition.x,
						y: airdrome.airdromeDefinition.y,
					},
					type: "TakeOff",
					duration: 0,
				},
				{
					arrivalTime: args.mission.time - 1000,
					name: "Race-Track Start",
					onGround: false,
					position: startPosition,
					type: "Task",
					duration: 3700000,
				},
				{
					arrivalTime: args.mission.time - 1000,
					name: "Race-Track End",
					onGround: false,
					position: endPosition,
					type: "RaceTrack End",
				},
			],
		});
	}
}
