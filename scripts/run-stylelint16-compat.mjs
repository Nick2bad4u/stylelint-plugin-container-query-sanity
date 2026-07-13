#!/usr/bin/env node

/**
 * @packageDocumentation
 * Run the Stylelint 16 compatibility smoke check by temporarily swapping the
 * installed Stylelint runtime, then restoring the working install.
 */
// @ts-check

import { copyFile, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const scriptsDirectoryPath = dirname(fileURLToPath(import.meta.url));
const repositoryRootPath = resolve(scriptsDirectoryPath, "..");
const packageJsonPath = join(repositoryRootPath, "package.json");
const packageLockJsonPath = join(repositoryRootPath, "package-lock.json");
const stylelintCompatSmokeScriptPath = join(
    scriptsDirectoryPath,
    "stylelint-compat-smoke.mjs"
);

/** @param {string} value */
const isWindowsAbsolutePath = (value) => /^[A-Za-z]:[\\/]/u.test(value);

/**
 * @param {string} filePath
 *
 * @returns {string}
 */
const toFileHref = (filePath) => {
    if (isWindowsAbsolutePath(filePath)) {
        const normalized = filePath.replaceAll("\\", "/");

        return new URL(`file:///${normalized}`).href;
    }

    return pathToFileURL(resolve(filePath)).href;
};

/**
 * Normalize unknown thrown values to Error instances.
 *
 * @param {unknown} error
 * @param {string} fallbackMessage
 *
 * @returns {Error}
 */
const toError = (error, fallbackMessage) =>
    error instanceof Error ? error : new Error(fallbackMessage);

/**
 * Execute an async cleanup step and collect any failure as a contextualized
 * Error instance without aborting subsequent cleanup work.
 *
 * @param {Error[]} cleanupErrors
 * @param {string} message
 * @param {() => Promise<void> | void} step
 *
 * @returns {Promise<void>}
 */
const runCleanupStep = async (cleanupErrors, message, step) => {
    try {
        await step();
    } catch (error) {
        cleanupErrors.push(
            new Error(message, {
                cause: toError(error, message),
            })
        );
    }
};

/**
 * @typedef {Readonly<{
 *     args: readonly string[];
 *     command: string;
 *     shell: boolean;
 * }>} CommandSpec
 */

/**
 * @param {string} [platform]
 *
 * @returns {string}
 */
export const getNpmCommand = (platform = process.platform) =>
    platform === "win32" ? "npm.cmd" : "npm";

/**
 * @param {NodeJS.ProcessEnv} [environment]
 *
 * @returns {string}
 */
export const getWindowsCommandShell = (environment = process.env) =>
    environment["ComSpec"] ?? environment["COMSPEC"] ?? "cmd.exe";

/**
 * @param {Readonly<{
 *     argvEntry?: string | undefined;
 *     currentImportUrl: string;
 * }>} input
 *
 * @returns {boolean}
 */
export const isDirectExecution = ({ argvEntry, currentImportUrl }) =>
    typeof argvEntry === "string" && toFileHref(argvEntry) === currentImportUrl;

/**
 * @param {Readonly<{
 *     nodeCommand?: string;
 *     npmCommand?: string;
 *     platform?: string;
 *     stylelintCompatSmokeScriptPath?: string;
 * }>} [input]
 *
 * @returns {readonly CommandSpec[]}
 */
export const createCompatibilityCheckCommands = ({
    nodeCommand = process.execPath,
    npmCommand = getNpmCommand(),
    platform = process.platform,
    stylelintCompatSmokeScriptPath:
        smokeScriptPath = stylelintCompatSmokeScriptPath,
} = {}) => {
    const shouldUseWindowsShell = platform === "win32";

    return [
        {
            args: ["run", "build"],
            command: npmCommand,
            shell: shouldUseWindowsShell,
        },
        {
            args: [
                "install",
                "--no-save",
                "--legacy-peer-deps",
                "stylelint@^16",
            ],
            command: npmCommand,
            shell: shouldUseWindowsShell,
        },
        {
            args: [smokeScriptPath, "--expect-stylelint-major=16"],
            command: nodeCommand,
            shell: false,
        },
    ];
};

/**
 * @param {Readonly<{
 *     npmCommand?: string;
 *     platform?: string;
 * }>} [input]
 *
 * @returns {CommandSpec}
 */
export const createRestoreDependenciesCommand = ({
    npmCommand = getNpmCommand(),
    platform = process.platform,
} = {}) => ({
    args: [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--legacy-peer-deps",
    ],
    command: npmCommand,
    shell: platform === "win32",
});

/**
 * Execute one child process synchronously and fail fast on non-zero exits.
 *
 * @param {Readonly<{
 *     command: string;
 *     args: readonly string[];
 *     repositoryRootPath?: string;
 *     shell?: boolean;
 *     windowsCommandShell?: string;
 * }>} input
 */
export function runCommand({
    args,
    command,
    repositoryRootPath: targetRepositoryRootPath = repositoryRootPath,
    shell = false,
    windowsCommandShell = getWindowsCommandShell(),
}) {
    const shouldUseWindowsCommandShell =
        process.platform === "win32" && shell === true;
    // npm run exports user configuration as npm_config_* variables. npm 12
    // rejects allow-scripts when that setting is relayed to a nested project
    // install, so let the nested npm process reload it from the user config.
    const childProcessEnvironment = Object.fromEntries(
        Object.entries(process.env).filter(
            ([name]) => name.toLowerCase() !== "npm_config_allow_scripts"
        )
    );
    const result = shouldUseWindowsCommandShell
        ? spawnSync(
              windowsCommandShell,
              [
                  "/d",
                  "/s",
                  "/c",
                  command,
                  ...args,
              ],
              {
                  cwd: targetRepositoryRootPath,
                  env: childProcessEnvironment,
                  shell: false,
                  stdio: "inherit",
                  windowsHide: true,
              }
          )
        : spawnSync(command, args, {
              cwd: targetRepositoryRootPath,
              env: childProcessEnvironment,
              shell: false,
              stdio: "inherit",
              windowsHide: true,
          });

    if (result.error !== undefined) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Command failed (${String(result.status)}): ${command} ${args.join(" ")}`
        );
    }
}

/**
 * @param {Readonly<{
 *     packageJsonPath: string;
 *     packageLockJsonPath: string;
 *     tempBackupDirectory: string;
 * }>} input
 *
 * @returns {{ packageJsonBackupPath: string; packageLockBackupPath: string }}
 */
const createBackupPaths = ({ tempBackupDirectory }) => ({
    packageJsonBackupPath: join(tempBackupDirectory, "package.json"),
    packageLockBackupPath: join(tempBackupDirectory, "package-lock.json"),
});

/**
 * Temporarily install Stylelint 16, run the compat smoke script, and restore
 * the working dependency installation and manifests afterwards.
 *
 * @param {Readonly<{
 *     copyFileFn?: typeof copyFile;
 *     cpFn?: typeof cp;
 *     mkdtempFn?: ((prefix: string) => Promise<string>) | undefined;
 *     nodeCommand?: string;
 *     npmCommand?: string;
 *     packageJsonPath?: string;
 *     packageLockJsonPath?: string;
 *     platform?: string;
 *     repositoryRootPath?: string;
 *     rmFn?: typeof rm;
 *     runCommandFn?:
 *         | ((
 *               input: CommandSpec & {
 *                   repositoryRootPath?: string;
 *                   windowsCommandShell?: string;
 *               }
 *           ) => void)
 *         | undefined;
 *     stylelintCompatSmokeScriptPath?: string;
 *     tmpDirectoryPath?: string;
 *     windowsCommandShell?: string;
 * }>} [input]
 *
 * @returns {Promise<void>}
 */
export async function runStylelint16Compat({
    copyFileFn = copyFile,
    cpFn = cp,
    mkdtempFn = mkdtemp,
    nodeCommand = process.execPath,
    npmCommand = getNpmCommand(),
    packageJsonPath: targetPackageJsonPath = packageJsonPath,
    packageLockJsonPath: targetPackageLockJsonPath = packageLockJsonPath,
    platform = process.platform,
    repositoryRootPath: targetRepositoryRootPath = repositoryRootPath,
    rmFn = rm,
    runCommandFn = runCommand,
    stylelintCompatSmokeScriptPath:
        targetSmokeScriptPath = stylelintCompatSmokeScriptPath,
    tmpDirectoryPath = tmpdir(),
    windowsCommandShell = getWindowsCommandShell(),
} = {}) {
    const tempBackupDirectory = await mkdtempFn(
        join(
            tmpDirectoryPath,
            "stylelint-plugin-container-query-sanity-stylelint16-"
        )
    );
    const { packageJsonBackupPath, packageLockBackupPath } = createBackupPaths({
        packageJsonPath: targetPackageJsonPath,
        packageLockJsonPath: targetPackageLockJsonPath,
        tempBackupDirectory,
    });

    await copyFileFn(targetPackageJsonPath, packageJsonBackupPath);
    await copyFileFn(targetPackageLockJsonPath, packageLockBackupPath);

    /** @type {Error | undefined} */
    let primaryError;
    /** @type {Error[]} */
    const cleanupErrors = [];

    try {
        for (const command of createCompatibilityCheckCommands({
            nodeCommand,
            npmCommand,
            platform,
            stylelintCompatSmokeScriptPath: targetSmokeScriptPath,
        })) {
            runCommandFn({
                ...command,
                repositoryRootPath: targetRepositoryRootPath,
                windowsCommandShell,
            });
        }
    } catch (error) {
        primaryError = toError(
            error,
            "Stylelint 16 compatibility check failed."
        );
    }

    await runCleanupStep(
        cleanupErrors,
        "Failed to restore package.json after the Stylelint 16 compatibility check.",
        async () => {
            await cpFn(packageJsonBackupPath, targetPackageJsonPath, {
                force: true,
            });
        }
    );
    await runCleanupStep(
        cleanupErrors,
        "Failed to restore package-lock.json after the Stylelint 16 compatibility check.",
        async () => {
            await cpFn(packageLockBackupPath, targetPackageLockJsonPath, {
                force: true,
            });
        }
    );
    await runCleanupStep(
        cleanupErrors,
        "Failed to restore dependencies after the Stylelint 16 compatibility check.",
        () => {
            runCommandFn({
                ...createRestoreDependenciesCommand({
                    npmCommand,
                    platform,
                }),
                repositoryRootPath: targetRepositoryRootPath,
                windowsCommandShell,
            });
        }
    );
    await runCleanupStep(
        cleanupErrors,
        `Failed to remove temporary backup directory: ${tempBackupDirectory}`,
        async () => {
            await rmFn(tempBackupDirectory, {
                force: true,
                recursive: true,
            });
        }
    );
    if (primaryError !== undefined && cleanupErrors.length > 0) {
        throw new AggregateError(
            [primaryError, ...cleanupErrors],
            "Stylelint 16 compatibility check failed and cleanup encountered additional errors."
        );
    }

    if (primaryError !== undefined) {
        throw primaryError;
    }

    if (cleanupErrors.length === 1) {
        throw cleanupErrors[0];
    }

    if (cleanupErrors.length > 1) {
        throw new AggregateError(
            cleanupErrors,
            "Stylelint 16 compatibility cleanup failed."
        );
    }
}

/**
 * CLI entrypoint for the Stylelint 16 compatibility wrapper.
 *
 * @returns {Promise<void>}
 */
export async function runCli() {
    await runStylelint16Compat();
}

if (
    isDirectExecution({
        argvEntry: process.argv[1],
        currentImportUrl: import.meta.url,
    })
) {
    try {
        await runCli();
    } catch (error) {
        console.error("Stylelint 16 compatibility check failed:", error);
        process.exitCode = 1;
    }
}
