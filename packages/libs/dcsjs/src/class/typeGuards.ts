import * as Data from "../data";

export const isStrikeFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.StrikeFlightGroup => {
	return (args as Data.InputTypes.StrikeFlightGroup).target != null && args.task === "Pinpoint Strike";
};

export const isCasFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.CasFlightGroup => {
	return (args as Data.InputTypes.CasFlightGroup).target != null && args.task === "CAS";
};

export const isCapFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.CapFlightGroup => {
	return (args as Data.InputTypes.CapFlightGroup).target != null && args.task === "CAP";
};

export const isEscortFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.EscortFlightGroup => {
	return (args as Data.InputTypes.EscortFlightGroup).target != null && args.task === "Escort";
};

export const isDeadFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.DeadFlightGroup => {
	return (args as Data.InputTypes.DeadFlightGroup).target != null && args.task === "DEAD";
};

export const isSeadFlightGroup = (args: Data.InputTypes.FlightGroup): args is Data.InputTypes.SeadFlightGroup => {
	return (args as Data.InputTypes.SeadFlightGroup).target != null && args.task === "SEAD";
};
