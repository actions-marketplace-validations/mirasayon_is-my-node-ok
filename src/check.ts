import path from "path";
import satisfies from "semver/functions/satisfies";
import { danger, vulnerableWarning, bold, separator, allGood } from "./ascii.js";
import { readFileSync } from "fs";
import type { corejson } from "./types/core.json.js";
import { nv } from "./utils/nv/index.js";
import { rootPath } from "./utils/paths.js";

/** `./data/vuln.json` */
const coreLocalFile = path.join(rootPath, "data", "vuln.json");

const vulnerabilitiesJSON = JSON.parse(readFileSync(coreLocalFile, "utf8")) as corejson;

const checkPlatform = (platform?: string) => {
	const availablePlatforms = ["aix", "darwin", "freebsd", "linux", "openbsd", "sunos", "win32", "android"];
	if (platform && !availablePlatforms.includes(platform)) {
		throw new Error(`platform ${platform} is not valid. Please use ${availablePlatforms.join(",")}.`);
	}
};
const isSystemAffected = (platform?: string, affectedEnvironments?: string | string[]) => {
	// No platform specified (legacy mode)
	if (!platform || !Array.isArray(affectedEnvironments)) {
		return true;
	}
	// If the environment is matching or all the environments are affected
	if (affectedEnvironments.includes(platform) || affectedEnvironments.includes("all")) {
		return true;
	}
	// Default to false
	return false;
};

function getVulnerabilityList(currentVersion: string, data: corejson, platform?: string) {
	const list = [];
	for (const key in data) {
		const vuln = data[key];
		if (
			satisfies(currentVersion, vuln.vulnerable) &&
			!satisfies(currentVersion, vuln.patched) &&
			isSystemAffected(platform, vuln.affectedEnvironments)
		) {
			const severity = vuln.severity === "unknown" ? "" : `(${vuln.severity})`;
			list.push(`${bold(vuln.cve)}${severity}: ${vuln.overview}\n${bold("Patched versions")}: ${vuln.patched}`);
		}
	}
	return list;
}

async function main(currentVersion: string, platform: string) {
	checkPlatform(platform);
	const isEOL = await isNodeEOL(currentVersion);
	if (isEOL) {
		console.error(danger);
		console.error(
			`Node.js ${currentVersion} is end-of-life. There are high chances of being vulnerable. Please upgrade it.`,
		);
		return;
	}

	const list = getVulnerabilityList(currentVersion, vulnerabilitiesJSON, platform);
	if (list.length) {
		console.error(danger);
		console.error(`${vulnerableWarning}\n`);
		return console.error(`${list.join(`\n${separator}\n\n`)}\n${separator}`);
	}
	return console.info(allGood);
}
/**
 * @param version Node version
 * @returns true if the version is end-of-life
 */
async function isNodeEOL(version: string): Promise<boolean> {
	const myVersionInfo = await nv(version);
	if (!myVersionInfo) {
		// i.e. isNodeEOL('abcd')
		throw Error(`Could not fetch version information for ${version}`);
	}
	if (myVersionInfo.length !== 1) {
		// i.e. isNodeEOL('lts') or isNodeEOL('99')
		throw Error(`Did not get exactly one version record for ${version}`);
	}
	if (!myVersionInfo[0].end) {
		// We got a record, but..
		// v0.12.18 etc does not have an EOL date, which probably means too old.
		return true;
	}
	const now = new Date();
	const end = new Date(myVersionInfo[0].end);
	return now > end;
}

/**
 *
 * @param version Node version
 * @param platform Platform name
 * @returns false if ok, true otherwise
 */
async function isNodeVulnerable(version: string, platform?: string) {
	checkPlatform(platform);
	const isEOL = await isNodeEOL(version);
	if (isEOL) {
		return true;
	}
	const list = getVulnerabilityList(version, vulnerabilitiesJSON, platform);
	return list.length > 0;
}

export { isNodeVulnerable, main };
