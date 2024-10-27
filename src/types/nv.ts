export interface VersionInfo {
	version: string;
	major: number;
	minor: number;
	patch: number;
	tag: string;
	codename: string;
	versionName: string;
	start?: Date;
	lts?: Date;
	maintenance?: Date;
	end?: Date;
	releaseDate: Date;
	isLts: boolean;
	files: string[];
	dependencies: {
		npm: string;
		v8: string;
		uv: string;
		zlib: string;
		openssl: string;
	};
}
export interface Options {
	now?: Date;
	cache?: Map<any, any>;
	mirror?: string;
	latestOfMajorOnly?: Boolean;
}

export type scheduleType = {
	[version: string]: {
		start: string;
		maintenance?: string;
		end: string;
		lts?: string;
		codename?: string;
	};
};
export type versionsType = {
	indexjson: {
		version: string;
		date: string;
		files: string[];
		npm: string;
		v8: string;
		uv: string;
		zlib: string;
		openssl: string;
		modules: string;
		lts: boolean;
		security: boolean;
	};
}[];
