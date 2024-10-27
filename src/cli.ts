import os from "os";
import { main } from "./check.js";
async function cli(): Promise<void> {
	await main(process.version, os.platform());

	console.log("Thanks for using our lib.");
}
cli();
