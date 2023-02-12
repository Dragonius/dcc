import * as DcsJs from "@foxdelta2/dcsjs";
import { DataStore } from "@kilcekru/dcc-shared-rpc-types";
import { createUniqueId } from "solid-js";

import {
	calcPackageEndTime,
	distanceToPosition,
	firstItem,
	getDurationEnRoute,
	getUsableAircraftsByType,
	Minutes,
	objectToPosition,
	oppositeCoalition,
} from "../../utils";
import { awacsTarget } from "../targetSelection";
import { RunningCampaignState } from "../types";
import { calcLandingWaypoints, generateCallSign, getCoalitionFaction } from "../utils";

export const generateAwacsPackage = (
	coalition: DcsJs.CampaignCoalition,
	state: RunningCampaignState,
	dataStore: DataStore,
	startTime: number
): DcsJs.CampaignPackage | undefined => {
	const faction = getCoalitionFaction(coalition, state);
	const oppFaction = getCoalitionFaction(oppositeCoalition(coalition), state);

	if (faction == null || dataStore?.airdromes == null) {
		return;
	}

	const usableAircrafts = getUsableAircraftsByType(faction?.inventory.aircrafts, faction?.aircraftTypes.awacs);

	if (usableAircrafts == null || usableAircrafts.length === 0) {
		return;
	}

	const speed = 170;

	const airdromeName = firstItem(faction.airdromeNames);

	if (airdromeName == null) {
		throw `airdrome not found: ${airdromeName ?? ""}`;
	}

	const airdrome = dataStore.airdromes[airdromeName];

	const raceTracks = awacsTarget(coalition, state.objectives, faction, oppFaction, dataStore);

	if (raceTracks == null) {
		return;
	}

	const [racetrackStart, racetrackEnd] = raceTracks;
	const durationEnRoute = getDurationEnRoute(airdrome, racetrackStart, speed);
	const duration = Minutes(120);

	const endEnRouteTime = startTime + durationEnRoute;
	const endOnStationTime = endEnRouteTime + 1 + duration;
	const [, landingWaypoints, landingTime] = calcLandingWaypoints(racetrackEnd, airdrome, endOnStationTime + 1);

	const cs = generateCallSign(state, dataStore, "awacs");

	const flightGroup: DcsJs.CampaignFlightGroup = {
		id: createUniqueId(),
		airdromeName,
		units:
			usableAircrafts?.slice(0, 1).map((aircraft, i) => ({
				id: aircraft.id,
				callSign: `${cs.unit}${i + 1}`,
				name: `${cs.flightGroup}-${i + 1}`,
				client: false,
			})) ?? [],
		name: cs.flightGroup,
		task: "AWACS",
		startTime,
		tot: endEnRouteTime + 1,
		landingTime,
		waypoints: [
			{
				name: "Take Off",
				position: objectToPosition(airdrome),
				endPosition: racetrackStart,
				time: startTime,
				endTime: endEnRouteTime,
				speed,
				onGround: true,
			},
			{
				name: "Track-race start",
				position: racetrackStart,
				endPosition: objectToPosition(airdrome),
				speed,
				time: endEnRouteTime + 1,
				endTime: endOnStationTime,
				duration,
				taskStart: true,
				racetrack: {
					position: racetrackEnd,
					name: "Track-race end",
					distance: distanceToPosition(racetrackStart, racetrackEnd),
					duration: getDurationEnRoute(racetrackStart, racetrackEnd, speed),
				},
			},
			...landingWaypoints,
		],
		position: objectToPosition(airdrome),
	};

	const flightGroups = [flightGroup];

	return {
		task: "AWACS" as DcsJs.Task,
		startTime,
		taskEndTime: endOnStationTime,
		endTime: calcPackageEndTime(flightGroups),
		flightGroups,
		frequency: coalition === "blue" ? 285.0 : 280.0,
		id: createUniqueId(),
	};
};