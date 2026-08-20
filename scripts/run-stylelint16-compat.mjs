#!/usr/bin/env node

/**
 * @packageDocumentation
 * Build and pack the plugin, then smoke-test the tarball in an isolated
 * consumer pinned to the latest supported Stylelint 16 release.
 */
// @ts-check

import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseNpmPackMetadata } from "./_internal/npm-pack-metadata.mjs";

const packageName = "stylelint-plugin-container-query-sanity";
const picocolorsVersion = "1.1.1";
const stylelint16Version = "16.26.1";
const scriptsDirectoryPath = dirname(fileURLToPath(import.meta.url));
const repositoryRootPath = resolve(scriptsDirectoryPath, "..");
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
 * @typedef {Readonly<{
 *     args: readonly string[];
 *     command: string;
 *     environment?: Readonly<Record<string, string>> | undefined;
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
 * Create the commands executed inside the isolated consumer.
 *
 * @param {Readonly<{
 *     nodeCommand?: string;
 *     npmCommand?: string;
 *     platform?: string;
 *     stylelintCompatSmokeScriptPath: string;
 *     tarballPath: string;
 * }>} input
 *
 * @returns {readonly CommandSpec[]}
 */
export const createCompatibilityCheckCommands = ({
    nodeCommand = process.execPath,
    npmCommand = getNpmCommand(),
    platform = process.platform,
    stylelintCompatSmokeScriptPath: smokeScriptPath,
    tarballPath,
}) => {
    const shouldUseWindowsShell = platform === "win32";

    return [
        {
            args: [
                "install",
                "--no-audit",
                "--no-fund",
                "--package-lock=false",
                "--save-exact",
                tarballPath,
                `stylelint@${stylelint16Version}`,
                `picocolors@${picocolorsVersion}`,
            ],
            command: npmCommand,
            shell: shouldUseWindowsShell,
        },
        {
            args: [smokeScriptPath, "--expect-stylelint-major=16"],
            command: nodeCommand,
            environment: {
                STYLELINT_COMPAT_PLUGIN_PACKAGE: packageName,
            },
            shell: false,
        },
    ];
};

/**
 * Execute one child process synchronously and fail fast on non-zero exits.
 *
 * @param {Readonly<{
 *     args: readonly string[];
 *     captureOutput?: boolean | undefined;
 *     command: string;
 *     environment?: Readonly<Record<string, string>> | undefined;
 *     repositoryRootPath?: string;
 *     shell?: boolean;
 *     windowsCommandShell?: string;
 * }>} input
 *
 * @returns {string}
 */
export function runCommand({
    args,
    captureOutput = false,
    command,
    environment = {},
    repositoryRootPath: targetRepositoryRootPath = repositoryRootPath,
    shell = false,
    windowsCommandShell = getWindowsCommandShell(),
}) {
    const shouldUseWindowsCommandShell =
        process.platform === "win32" && shell === true;
    const childProcessEnvironment = {
        ...Object.fromEntries(
            Object.entries(process.env).filter(
                ([name]) => name.toLowerCase() !== "npm_config_allow_scripts"
            )
        ),
        ...environment,
    };
    const spawnOptions = {
        cwd: targetRepositoryRootPath,
        encoding: /** @type {const} */ ("utf8"),
        env: childProcessEnvironment,
        shell: false,
        stdio: /** @type {const} */ (
            captureOutput
                ? [
                      "ignore",
                      "pipe",
                      "inherit",
                  ]
                : "inherit"
        ),
        windowsHide: true,
    };
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
              spawnOptions
          )
        : spawnSync(command, args, spawnOptions);

    if (result.error !== undefined) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Command failed (${String(result.status)}): ${command} ${args.join(" ")}`
        );
    }

    return typeof result.stdout === "string" ? result.stdout : "";
}

/**
 * Build and pack the repository, then validate its tarball against Stylelint 16
 * without modifying repository manifests, the lockfile, or node_modules.
 *
 * @param {Readonly<{
 *     copyFileFn?: typeof copyFile;
 *     mkdtempFn?: ((prefix: string) => Promise<string>) | undefined;
 *     nodeCommand?: string;
 *     npmCommand?: string;
 *     platform?: string;
 *     repositoryRootPath?: string;
 *     rmFn?: typeof rm;
 *     runCommandFn?: typeof runCommand;
 *     stylelintCompatSmokeScriptPath?: string;
 *     tmpDirectoryPath?: string;
 *     windowsCommandShell?: string;
 *     writeFileFn?: typeof writeFile;
 * }>} [input]
 *
 * @returns {Promise<void>}
 */
export async function runStylelint16Compat({
    copyFileFn = copyFile,
    mkdtempFn = mkdtemp,
    nodeCommand = process.execPath,
    npmCommand = getNpmCommand(),
    platform = process.platform,
    repositoryRootPath: targetRepositoryRootPath = repositoryRootPath,
    rmFn = rm,
    runCommandFn = runCommand,
    stylelintCompatSmokeScriptPath:
        targetSmokeScriptPath = stylelintCompatSmokeScriptPath,
    tmpDirectoryPath = tmpdir(),
    windowsCommandShell = getWindowsCommandShell(),
    writeFileFn = writeFile,
} = {}) {
    const tempConsumerDirectory = await mkdtempFn(
        join(tmpDirectoryPath, `${packageName}-stylelint16-`)
    );

    try {
        runCommandFn({
            args: ["run", "build"],
            command: npmCommand,
            repositoryRootPath: targetRepositoryRootPath,
            shell: platform === "win32",
            windowsCommandShell,
        });

        const packOutput = runCommandFn({
            args: [
                "pack",
                "--ignore-scripts",
                "--json",
                "--pack-destination",
                tempConsumerDirectory,
            ],
            captureOutput: true,
            command: npmCommand,
            repositoryRootPath: targetRepositoryRootPath,
            shell: platform === "win32",
            windowsCommandShell,
        });
        const { filename } = parseNpmPackMetadata(packOutput);
        const tarballPath = join(tempConsumerDirectory, filename);

        if (basename(tarballPath) !== filename) {
            throw new Error("Packed tarball escaped the temporary consumer.");
        }

        const consumerPackageJson = {
            allowScripts: {},
            name: `${packageName}-stylelint16-compat`,
            private: true,
            type: "module",
            version: "0.0.0",
        };
        await writeFileFn(
            join(tempConsumerDirectory, "package.json"),
            `${JSON.stringify(consumerPackageJson, undefined, 2)}\n`,
            "utf8"
        );
        await writeFileFn(
            join(tempConsumerDirectory, ".npmrc"),
            "strict-allow-scripts=true\n",
            "utf8"
        );
        const copiedSmokeScriptPath = join(
            tempConsumerDirectory,
            "stylelint-compat-smoke.mjs"
        );
        await copyFileFn(targetSmokeScriptPath, copiedSmokeScriptPath);

        for (const command of createCompatibilityCheckCommands({
            nodeCommand,
            npmCommand,
            platform,
            stylelintCompatSmokeScriptPath: copiedSmokeScriptPath,
            tarballPath,
        })) {
            runCommandFn({
                ...command,
                repositoryRootPath: tempConsumerDirectory,
                windowsCommandShell,
            });
        }
    } finally {
        await rmFn(tempConsumerDirectory, {
            force: true,
            recursive: true,
        });
    }
}

/** @returns {Promise<void>} */
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
