import pkg from "cli-color";
const { bold, red, green } = pkg;

const danger = red("Danger");
const allGood = `All good ${green(":)")}`;
const vulnerableWarning = bold(`The current Node.js version (${process.version}) is vulnerable to the following CVEs:`);

const separator = "=".repeat(process.stdout.columns);

export { danger, allGood, bold, vulnerableWarning, separator };
