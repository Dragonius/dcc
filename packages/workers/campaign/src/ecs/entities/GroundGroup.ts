import type * as DcsJs from "@foxdelta2/dcsjs";
import type * as Types from "@kilcekru/dcc-shared-types";
import * as Utils from "@kilcekru/dcc-shared-utils";

import { QueryKey } from "../world";
import { GroundUnit } from "./GroundUnit";
import { Group, GroupProps } from "./Group";
import type { Objective } from "./Objective";
export interface GroundGroupProps extends Omit<GroupProps, "position"> {
	start: Objective;
	target: Objective;
	groupType?: DcsJs.CampaignGroundGroupType;
}

export class GroundGroup extends Group {
	public name: string;
	public start: Objective;
	public target: Objective;
	public type: DcsJs.CampaignGroundGroupType;
	public units: Array<GroundUnit>;
	public shoradUnits: Array<GroundUnit>;

	get aliveUnits(): Array<GroundUnit> {
		return this.units.filter((u) => u.alive);
	}

	constructor(args: GroundGroupProps) {
		const queries: Set<QueryKey> = new Set(["groundGroups", "mapEntities"]);

		// If the group is not already at the target, add it to the en route query
		if (args.start === args.target) {
			queries.add("groundGroups-on target");
		} else {
			queries.add("groundGroups-en route");
		}

		super({ ...args, queries, position: args.start.position });
		this.name = args.target.name + "-" + this.id;
		this.start = args.start;
		this.target = args.target;
		const randomNumber = Utils.Random.number(1, 100);
		const groupType = randomNumber > 50 ? "armor" : "infantry";

		const { groundUnits, shoradGroundUnits } = GroundUnit.generate(args.coalition, this, groupType);
		this.type = groupType;
		this.units = groundUnits;
		this.shoradUnits = shoradGroundUnits;
	}

	static generate(args: { coalition: DcsJs.Coalition; objectivePlans: Array<Types.Campaign.ObjectivePlan> }) {
		for (const plan of args.objectivePlans) {
			if (plan.groundUnitTypes.some((gut) => gut === "vehicles")) {
				const obj = this.world.objectives.get(plan.objectiveName);

				if (obj == null) {
					throw new Error(`Objective ${plan.objectiveName} not found`);
				}

				new GroundGroup({
					coalition: args.coalition,
					start: obj,
					target: obj,
				});
			}
		}
	}

	move(worldDelta: number) {
		const heading = Utils.Location.headingToPosition(this.position, this.target.position);
		// Calculate the distance traveled in meters in the tick
		const distanceTraveled = Math.round(Utils.DateTime.toSeconds(worldDelta) * Utils.Config.defaults.groundGroupSpeed);
		// Calculate the new position
		this.position = Utils.Location.positionFromHeading(this.position, heading, distanceTraveled);
	}

	destroyUnit(unit: GroundUnit) {
		unit.destroy();

		if (this.aliveUnits.length === 0) {
			this.deconstructor();

			return true;
		}

		return false;
	}

	/**
	 * If the group is at the target
	 */
	moveOntoTarget() {
		this.position = this.target.position;
		this.removeFromQuery("groundGroups-en route");
	}

	override deconstructor() {
		this.units.forEach((u) => u.deconstructor());
		this.shoradUnits.forEach((u) => u.deconstructor());
		super.deconstructor();
	}

	toMapJSON(): Types.Campaign.MapItem {
		return {
			coalition: this.coalition,
			position: this.position,
			name: this.name,
			type: "groundGroup",
			groundGroupType: this.type,
		};
	}

	override toJSON(): Types.Campaign.GroundGroupItem {
		return {
			...super.toJSON(),
			name: this.name,
			start: this.start.name,
			target: this.target.name,
			type: this.type,
			units: this.units.map((u) => u.toJSON()),
			shoradUnits: this.shoradUnits.map((u) => u.toJSON()),
		};
	}
}