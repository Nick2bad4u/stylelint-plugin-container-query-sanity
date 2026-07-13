import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = process.argv.slice(2);

if (args.length === 0) {
    throw new TypeError("Expected an npm command and optional arguments.");
}

// npm exports user configuration as npm_config_* during npm run. npm 12
// rejects allow-scripts when it is relayed to a nested project operation.
// Removing only the environment copy lets nested npm reload the same policy
// from the user configuration at its proper scope.
const childProcessEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
        ([name]) => name.toLowerCase() !== "npm_config_allow_scripts"
    )
);

/** @type {import("node:child_process").SpawnSyncOptions} */
const spawnOptions = {
    env: childProcessEnvironment,
    shell: false,
    stdio: "inherit",
    windowsHide: true,
};
const result =
    process.platform === "win32"
        ? spawnSync(
              process.env["ComSpec"] ?? "cmd.exe",
              [
                  "/d",
                  "/s",
                  "/c",
                  npmCommand,
                  ...args,
              ],
              spawnOptions
          )
        : spawnSync(npmCommand, args, spawnOptions);

if (result.error !== undefined) {
    throw result.error;
}

process.exitCode = result.status ?? 1;
