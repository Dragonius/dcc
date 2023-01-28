import * as DcsJs from "@foxdelta2/dcsjs";
import { DataStore } from "@kilcekru/dcc-shared-rpc-types";
import { createUniqueId } from "solid-js";

import {
	addHeading,
	calcPackageEndTime,
	firstItem,
	getDurationEnRoute,
	getUsableAircraftsByType,
	headingToPosition,
	Minutes,
	objectToPosition,
	oppositeCoalition,
	positionFromHeading,
	random,
} from "../../utils";
import { getStrikeTarget } from "../targetSelection";
import { RunningCampaignState } from "../types";
import { calcLandingWaypoints, calcNearestOppositeAirdrome, generateCallSign, getCoalitionFaction } from "../utils";

export const generateStrikePackage = (
	coalition: DcsJs.CampaignCoalition,
	state: RunningCampaignState,
	dataStore: DataStore
): DcsJs.CampaignPackage | undefined => {
	const faction = getCoalitionFaction(coalition, state);
	const oppCoalition = oppositeCoalition(coalition);
	const oppFaction = getCoalitionFaction(oppCoalition, state);

	if (faction == null || dataStore.airdromes == null) {
		return;
	}

	const usableAircrafts = getUsableAircraftsByType(faction?.inventory.aircrafts, faction?.aircraftTypes.strike);

	if (usableAircrafts == null || usableAircrafts.length === 0) {
		return;
	}

	const airdromeName = firstItem(faction?.airdromeNames);

	if (airdromeName == null) {
		throw `airdrome not found: ${airdromeName ?? ""}`;
	}

	const airdrome = dataStore.airdromes[airdromeName];

	const target = getStrikeTarget(airdrome, state.objectives, oppCoalition, oppFaction);

	if (target == null) {
		return;
	}

	const speed = 170;
	const ingressPosition = positionFromHeading(target.position, headingToPosition(target.position, airdrome), 15000);

	const oppAirdrome = calcNearestOppositeAirdrome(coalition, state, dataStore, target.position);
	const engressHeading =
		oppAirdrome == null
			? headingToPosition(target.position, airdrome)
			: headingToPosition(target.position, { x: oppAirdrome.x, y: oppAirdrome.y });
	const engressPosition = positionFromHeading(target.position, addHeading(engressHeading, 180), 20000);

	const durationEnRoute = getDurationEnRoute(airdrome, ingressPosition, speed);
	const durationIngress = getDurationEnRoute(ingressPosition, target.position, speed);
	const durationEngress = getDurationEnRoute(target.position, engressPosition, speed);

	const startTime = Math.floor(state.timer) + Minutes(random(30, 60));
	const endEnRouteTime = startTime + durationEnRoute;
	const endIngressTime = endEnRouteTime + durationIngress;
	const endEngressTime = endIngressTime + durationEngress;
	const [landingNavPosition, landingWaypoints, landingTime] = calcLandingWaypoints(
		engressPosition,
		airdrome,
		endEngressTime + 1
	);

	const cs = generateCallSign(state);

	const flightGroup: DcsJs.CampaignFlightGroup = {
		id: createUniqueId(),
		airdromeName,
		units:
			usableAircrafts?.slice(0, 2).map((aircraft, i) => ({
				id: aircraft.id,
				callSign: `${cs.unit}${i + 1}`,
				name: `${cs.flightGroup}-${i + 1}`,
				client: false,
			})) ?? [],
		name: cs.flightGroup,
		task: "Pinpoint Strike",
		startTime,
		tot: endEnRouteTime + 1,
		landingTime: landingTime,
		waypoints: [
			{
				name: "Take Off",
				position: objectToPosition(airdrome),
				endPosition: ingressPosition,
				time: startTime,
				endTime: endEnRouteTime,
				speed,
				onGround: true,
			},
			{
				name: "Ingress",
				position: ingressPosition,
				endPosition: target.position,
				speed,
				time: endEnRouteTime + 1,
				endTime: endIngressTime,
				taskStart: true,
			},
			{
				name: "Strike",
				position: target.position,
				endPosition: engressPosition,
				speed,
				time: endIngressTime + 1,
				endTime: endIngressTime + 1,
				onGround: true,
			},
			{
				name: "Engress",
				position: engressPosition,
				endPosition: landingNavPosition,
				speed,
				time: endIngressTime + 2,
				endTime: endEngressTime,
			},
			...landingWaypoints,
		],
		objective: {
			coalition,
			name: target.name,
			position: target.position,
			structures: [target],
			unitIds: [],
		},
		position: objectToPosition(airdrome),
	};

	const flightGroups = [flightGroup];

	return {
		task: "Pinpoint Strike" as DcsJs.Task,
		startTime,
		endTime: calcPackageEndTime(flightGroups),
		flightGroups,
		id: createUniqueId(),
	};
};
