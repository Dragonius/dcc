import * as Path from "node:path";

import chokidar from "chokidar";
import esbuild from "esbuild";
import postCss from "esbuild-plugin-postcss2";
import { solidPlugin } from "esbuild-plugin-solid";
import FS from "fs-extra";

import { log, paths } from "./utils.mjs";

export async function buildApps({ env, watch }) {
	const apps = await findApps();

	const entryPoints = Object.fromEntries(
		apps.map((app) => [`${app}/index`, Path.join(paths.apps, app, "src/index.tsx")])
	);

	await Promise.all([
		esbuild.build({
			entryPoints,
			outdir: Path.join(paths.target, "apps"),
			bundle: true,
			minify: env === "pro",
			define: {
				BUILD_ENV: JSON.stringify(env !== "pro"),
			},
			loader: {
				".svg": "dataurl",
			},
			plugins: [solidPlugin(), postCss.default()],
			watch: watch && {
				onRebuild: (err) => {
					if (err) {
						log("err", `Rebuild apps failed (${err.message})`);
					} else {
						log("info", "Rebuilt apps");
					}
				},
			},
		}),
		buildIndex({ apps, watch }),
	]);
}

async function findApps() {
	const list = await FS.readdir(paths.apps, { withFileTypes: true });

	const apps = [];
	for (const entry of list) {
		if (entry.isDirectory()) {
			try {
				await FS.access(Path.join(paths.apps, entry.name, "src/index.tsx"));
				apps.push(entry.name);
			} catch {
				log("warn", `Invalid app '${entry.name}'`);
			}
		}
	}
	return apps;
}

async function buildIndex({ apps, watch }) {
	await copyIndex({ apps });
	if (watch) {
		chokidar.watch(paths.indexHtml, { ignoreInitial: true }).on("all", async () => {
			try {
				await copyIndex({ apps });
				log("info", "Rebuilt index.html");
			} catch (err) {
				log("err", `Rebuild index.html failed (${err.message})`);
			}
		});
	}
}

async function copyIndex({ apps }) {
	const index = await FS.readFile(paths.indexHtml, "utf-8");

	const promises = apps.map(async (app) => {
		const content = index.replaceAll("<!-- INJECT-TITLE -->", app.charAt(0).toUpperCase() + app.slice(1));
		await FS.outputFile(Path.join(paths.target, "apps", app, "index.html"), content);
	});

	await Promise.all(promises);
}