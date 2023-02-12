import type * as DcsJs from "@foxdelta2/dcsjs";
import { rpc } from "@kilcekru/dcc-lib-rpc";
import { CampaignState } from "@kilcekru/dcc-shared-rpc-types";
import { useContext } from "solid-js";
import { unwrap } from "solid-js/store";

import { Button, CampaignContext } from "../../../../components";
import styles from "./Header.module.less";
import { TimerClock } from "./TimerClock";

export const Header = (props: { showMissionModal: () => void }) => {
	const [state, { pause }] = useContext(CampaignContext);

	const onSave = () => {
		rpc.campaign
			.save(JSON.parse(JSON.stringify(state)) as CampaignState)
			.then((result) => {
				console.log("save", result); // eslint-disable-line no-console
			})
			.catch((err) => {
				console.log("RPC error", err); // eslint-disable-line no-console
			});
	};

	const onGenerateMission = async () => {
		pause?.();

		const unwrapped = unwrap(state);

		if (unwrapped.blueFaction == null || unwrapped.redFaction == null) {
			throw "faction not found";
		}

		await rpc.campaign.generateCampaignMission(JSON.parse(JSON.stringify(unwrapped)) as DcsJs.Campaign);

		props.showMissionModal();
	};

	return (
		<div class={styles.header}>
			<h1 class={styles.title}>Red Waters</h1>
			<div>
				<TimerClock />
			</div>
			<div class={styles.buttons}>
				<Button onPress={onSave} large>
					Save
				</Button>
				<Button onPress={onGenerateMission} large>
					Takeoff
				</Button>
			</div>
		</div>
	);
};