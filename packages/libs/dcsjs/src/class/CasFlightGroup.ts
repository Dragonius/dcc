import * as Data from "../data";
import { FlightGroup, FlightGroupProps } from "./FlightGroup";
import { JtacFlightGroup } from "./JtacFlightGroup";
import { Mission } from "./Mission";

export type CasFlightGroupProps = FlightGroupProps & {
	target: Data.InputTypes.GroundGroup;
	jtac?: JtacFlightGroup;
};

export class CasFlightGroup extends FlightGroup {
	#target: Data.InputTypes.GroundGroup;
	#jtac?: JtacFlightGroup;

	get target() {
		return this.#target;
	}

	get jtac() {
		return this.#jtac;
	}

	constructor(args: CasFlightGroupProps) {
		super(args);

		this.#target = args.target;
		this.#jtac = args.jtac;
	}

	public override getFrequencies(mission: Mission): Data.GroupFrequencies {
		const f = super.getFrequencies(mission);

		if (this.#jtac) {
			f.jtac = this.#jtac.frequency;
		}

		return f;
	}
}
