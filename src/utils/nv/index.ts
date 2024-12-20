// @ts-nocheck
import { readFileSync } from "fs";
import type { Options, scheduleType, VersionInfo, versionsType } from "../../types/nv.js";

import semver from "semver";
import { rootPath } from "../../utils/paths.js";
import { join } from "path";
const _cache = new Map();
export async function nv(alias: string | string[] = "lts_active", opts: Options = {}): Promise<VersionInfo[]> {
	const now = opts.now || new Date();
	const cache = opts.cache || _cache;
	const mirror = opts.mirror || "https://nodejs.org/dist/";
	const latestOfMajorOnly = opts.latestOfMajorOnly || false;

	const a = Array.isArray(alias) ? alias : [alias];
	const versions = await getLatestVersionsByCodename(now, cache, mirror);

	// Reduce to an object
	let m = a.reduce((m, a) => {
		const vers = resolveAlias(versions, a);
		if (Array.isArray(vers)) {
			vers.forEach((v) => {
				m[v.version] = v;
			});
		} else if (vers) {
			m[vers.version] = vers;
		}
		return m;
	}, {});

	// If only latest major is true, filter out all but latest
	if (latestOfMajorOnly) {
		const vers = Object.values(m).reduce((latestMajor, v) => {
			// If highest in version range, save off
			if (!latestMajor[v.major] || semver.gt(v.version, latestMajor[v.major].version)) {
				latestMajor[v.major] = v;
			}
			return latestMajor;
		}, {});
		m = Array.from(Object.values(vers));
	}

	// Sort and pluck version
	return Object.values(m).sort((v1, v2) => {
		return semver.gt(v1.version, v2.version) ? 1 : -1;
	});
}

function resolveAlias(versions: { [ver: string]: any }, alias: number | string) {
	if (typeof alias === "number" && versions[`v${alias}`]) {
		return versions[`v${alias}`];
	}

	if (typeof alias === "string") {
		if (versions[alias.toLowerCase()]) {
			return versions[alias.toLowerCase()];
		}
		// Alias might be a semver range
		return versions.all.filter((v) => semver.satisfies(v.version, alias));
	}
}

async function getSchedule(cache?: Map<any, any>): Promise<scheduleType> {
	// const data = await got("https://raw.githubusercontent.com/nodejs/Release/master/schedule.json", {
	// 	cache,
	// }).json();
	const str = readFileSync(join(rootPath, "data", "schedule.json"), "utf8");
	const data = JSON.parse(str);
	return data as scheduleType;
}

async function getVersions(cache: Map<any, any>, mirror: string) {
	/**'https://nodejs.org/dist/index.json' */
	// const url = mirror.replace(/\/$/, "") + "/index.json";
	// const data = (await got(url, {
	// 	cache,
	// }).json()) as versionsType;
	const str = readFileSync(join(rootPath, "data", "versions.json"), "utf8");
	const data = JSON.parse(str);
	return data;
}

async function getLatestVersionsByCodename(now: Date, cache?: Map<any, any>, mirror?: string) {
	const schedule = await getSchedule(cache);
	const versions = await getVersions(cache, mirror);

	// Composite aliases point to the HEAD for each release line
	const supported = {};
	const active = {};
	const ltsActive = {};
	const lts = {};

	const aliases = versions.reduce(
		(obj, ver) => {
			const { major, minor, patch, tag } = splitVersion(ver.version);
			const versionName = major !== "0" ? `v${major}` : `v${major}.${minor}`;
			const codename = ver.lts ? ver.lts.toLowerCase() : versionName;
			const version = tag !== "" ? `${major}.${minor}.${patch}-${tag}` : `${major}.${minor}.${patch}`;
			const s = schedule[versionName];

			// Version Object
			const v = {
				version,
				major,
				minor,
				patch,
				tag,
				codename,
				versionName,
				start: s && s.start && new Date(s.start),
				lts: s && s.lts && new Date(s.lts),
				maintenance: s && s.maintenance && new Date(s.maintenance),
				end: s && s.end && new Date(s.end),
				releaseDate: new Date(ver.date),
				isLts: false,
				files: ver.files || [],
				dependencies: {
					npm: ver.npm,
					v8: ver.v8,
					uv: ver.uv,
					zlib: ver.zlib,
					openssl: ver.openssl,
				},
			};

			// All versions get added to all
			obj.all.push(v);

			// Add specific version references
			obj[v.version] = obj[`v${v.version}`] = v;

			// The new version is higher than the last stored version for this release line
			if (!obj[versionName] || semver.gt(ver.version, obj[versionName].version)) {
				// Version and codename alias
				obj[versionName] = obj[codename] = v;

				if (now > v.start && now < v.end) {
					supported[versionName] = v;

					if (now < v.maintenance) {
						active[versionName] = v;
					}

					// Latest lts
					if (now > v.lts) {
						lts[versionName] = v;
						v.isLts = true;

						if (now < v.maintenance) {
							ltsActive[versionName] = v;
						}

						if (!obj.lts_latest || semver.gt(ver.version, obj.lts_latest.version)) {
							obj.lts_latest = v;
						}
					}

					// The newest supported release
					if (!obj.current || semver.gt(ver.version, obj.current.version)) {
						obj.current = v;
					}
				}
			}

			return obj;
		},
		{
			all: [],
		},
	);

	// Add composite aliases
	[
		["supported", supported],
		["active", active],
		["lts_active", ltsActive],
		["lts", lts],
	].forEach(([alias, vers]) => {
		aliases[alias] = Object.values(vers);
	});

	// nvm --lts='lts/*'
	aliases["lts/*"] = aliases.lts_latest;

	// nvm 'node'
	aliases.node = aliases.current;

	// Deprecated maintained alias
	let deprecationShown = false;
	Object.defineProperty(aliases, "maintained", {
		get: () => {
			if (!deprecationShown) {
				deprecationShown = true;
				console.warn(new Error("maintained is deprecated, use supported"));
			}
			return Object.values(supported);
		},
	});

	return aliases;
}

function splitVersion(ver: string) {
	const regexp = /^v([0-9]*)\.([0-9]*)\.([0-9]*)(?:-([0-9A-Za-z-_]+))?/;
	const [, major, minor, patch, tag] = regexp.exec(ver)!.map((n, i) => (i < 4 ? parseInt(n, 10) : n || ""));
	return { major, minor, patch, tag };
}
