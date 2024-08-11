import * as Path from "node:path";

import AdmZip from "adm-zip";

import Logo from "./assets/DCC_Logo_1024.png";
import { Mission } from "./class";
import CAS from "./template/l10n/DEFAULT/cas.lua";
import CSAR from "./template/l10n/DEFAULT/csar.lua";
import Dictionary from "./template/l10n/DEFAULT/dictionary.template";
import EWR from "./template/l10n/DEFAULT/ewr.lua";
import Json from "./template/l10n/DEFAULT/json.lua";
import MapResource from "./template/l10n/DEFAULT/mapResource.template";
import MissionLua from "./template/l10n/DEFAULT/mission.lua";
import Mist from "./template/l10n/DEFAULT/mist_4_5_126.lua";
import State from "./template/l10n/DEFAULT/state.lua";
import Utils from "./template/l10n/DEFAULT/utils.lua";
import Options from "./template/options.template";

export async function save(args: { mission: Mission; path?: string; kneeboards?: Array<Buffer> }) {
	if (args.path != null && args.path.endsWith(".miz") === false) {
		throw new Error("invalid path");
	}

	// eslint-disable-next-line no-console
	console.log("💾 saving mission...");

	const zip = new AdmZip();

	zip.addFile("l10n/DEFAULT/dictionary", Buffer.from(Dictionary));
	zip.addFile("l10n/DEFAULT/mapResource", Buffer.from(MapResource));
	zip.addFile("l10n/DEFAULT/mist_4_5_126.lua", Buffer.from(Mist));
	zip.addFile("l10n/DEFAULT/json.lua", Buffer.from(Json));
	zip.addFile("l10n/DEFAULT/mission-config.lua", Buffer.from("config = " + args.mission.toMissionConfig(), "utf-8"));
	zip.addFile("l10n/DEFAULT/state.lua", Buffer.from(State));
	zip.addFile("l10n/DEFAULT/ewr.lua", Buffer.from(EWR));
	zip.addFile("l10n/DEFAULT/cas.lua", Buffer.from(CAS));
	zip.addFile("l10n/DEFAULT/csar.lua", Buffer.from(CSAR));
	zip.addFile("l10n/DEFAULT/utils.lua", Buffer.from(Utils));
	zip.addFile("l10n/DEFAULT/mission.lua", Buffer.from(MissionLua));
	zip.addFile("mission", Buffer.from("mission = " + args.mission.toMissionLuaTable(), "utf-8"));
	zip.addFile("options", Buffer.from(Options));
	zip.addFile("theatre", Buffer.from(args.mission.theatre));
	zip.addFile("warehouses", Buffer.from("warehouses = " + args.mission.toWarehouseLuaTable(), "utf-8"));

	zip.addLocalFile(Path.join(__dirname, Logo), "l10n/DEFAULT", "DCC_Logo_1024.png");

	if (args.kneeboards != null) {
		args.kneeboards.forEach((kb, i) => {
			zip.addFile(`KNEEBOARD/IMAGES/dcc-briefing-${(i + 1).toString().padStart(2, "0")}.png`, kb);
		});
	}

	if (args.path) {
		zip.writeZip(args.path);

		// eslint-disable-next-line no-console
		console.log("🚀 mission saved to", args.path);
		return;
	}

	return zip.toBuffer();
}
