import { Theatre } from "../enums";
import { TheatreData } from "../types";
import { Caucasus } from "./caucasus";
import { PersianGulf } from "./persianGulf";
import { Syria } from "./syria";

export const Theatres = {
	Caucasus,
	Normandy: Caucasus,
	PersianGulf,
	SouthAtlantic: Caucasus,
	Syria,
} satisfies Record<Theatre, TheatreData>;
