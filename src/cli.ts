#!/usr/bin/env node
import { platform } from "node:os";
import { version } from "node:process";
import { main, loadETag } from "./check.js";
async function cli() {
	if (process.argv[2] !== "-r") {
		await loadETag();
	}
	await main(version, platform());
}
cli();
