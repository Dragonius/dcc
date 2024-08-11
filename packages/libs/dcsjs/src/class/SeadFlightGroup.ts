import * as Data from "../data";
import { FlightGroup, FlightGroupProps } from "./FlightGroup";

export type SeadFlightGroupProps = FlightGroupProps & {
	target: Data.InputTypes.FlightGroup;
};

export class SeadFlightGroup extends FlightGroup {
	#target: Data.InputTypes.FlightGroup;

	get target() {
		return this.#target;
	}

	constructor(args: SeadFlightGroupProps) {
		super(args);

		this.#target = args.target;
	}
}
