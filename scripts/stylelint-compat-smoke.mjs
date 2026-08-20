#!/usr/bin/env node

/**
 * @remarks
 * This script is intended for compatibility-matrix jobs that temporarily
 * install an older supported Stylelint major (for example 16.x) before running
 * the smoke check. We intentionally do not target Stylelint 15 because the
 * first officially supported ESM plugin line starts at Stylelint 16.
 *
 * @packageDocumentation
 * Smoke test the built plugin against an installed Stylelint runtime.
 */
// @ts-check

import { isDeepStrictEqual } from "node:util";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import pc from "picocolors";

const expectedStylelintMajorArgumentPrefix = "--expect-stylelint-major=";
const installedPluginPackageName = "stylelint-plugin-container-query-sanity";
const requestedPluginPackage = process.env["STYLELINT_COMPAT_PLUGIN_PACKAGE"];

if (
    requestedPluginPackage !== undefined &&
    requestedPluginPackage !== installedPluginPackageName
) {
    throw new Error(
        `Unsupported STYLELINT_COMPAT_PLUGIN_PACKAGE value: ${requestedPluginPackage}`
    );
}

const builtPluginModuleUrl = new URL("../dist/plugin.js", import.meta.url);
const builtPluginCjsPath = fileURLToPath(
    new URL("../dist/plugin.cjs", import.meta.url)
);
const builtPluginImportTarget =
    requestedPluginPackage ?? builtPluginModuleUrl.href;
const builtPluginRequireTarget = requestedPluginPackage ?? builtPluginCjsPath;

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
 * @typedef {(string | import("stylelint").Plugin)[]} StylelintConfigPluginArray
 */

/**
 * @typedef {Readonly<{
 *     code: string;
 *     config: import("stylelint").Config;
 *     codeFilename: string;
 *     name: string;
 * }>} ConfigScenario
 */

/**
 * @typedef {Readonly<{
 *     invalidOptionWarnings?: readonly unknown[];
 *     parseErrors?: readonly unknown[];
 *     warnings?: readonly unknown[];
 * }>} StylelintResultLike
 */

/**
 * @typedef {Readonly<{
 *     lint: (
 *         input: Readonly<{
 *             code: string;
 *             codeFilename: string;
 *             config: import("stylelint").Config;
 *         }>
 *     ) => Promise<
 *         Readonly<{
 *             results: readonly StylelintResultLike[];
 *         }>
 *     >;
 * }>} StylelintLike
 */

/**
 * @typedef {Readonly<{
 *     "container-query-all": import("stylelint").Config &
 *         Readonly<{
 *             plugins: StylelintConfigPluginArray;
 *             rules: Readonly<Record<string, unknown>>;
 *         }>;
 *     "container-query-recommended": import("stylelint").Config &
 *         Readonly<{
 *             plugins: StylelintConfigPluginArray;
 *             rules: Readonly<Record<string, unknown>>;
 *         }>;
 * }>} BuiltPluginConfigs
 */

/**
 * @typedef {Readonly<{
 *     builtPluginCjs: unknown;
 *     configNames: readonly string[];
 *     containerQuerySanityPluginConfigs: BuiltPluginConfigs;
 *     meta: Readonly<{
 *         name: string;
 *         namespace: string;
 *     }>;
 *     plugin: StylelintConfigPluginArray;
 *     ruleIds: readonly string[];
 *     ruleNames: readonly string[];
 *     rules: Readonly<
 *         Record<
 *             string,
 *             Readonly<{
 *                 ruleName: string;
 *             }>
 *         >
 *     >;
 * }>} BuiltPluginSurface
 */

/**
 * @typedef {Pick<typeof console, "log">} InfoLogger
 */

/**
 * @typedef {Pick<typeof console, "error" | "log">} CliLogger
 */

/**
 * @param {readonly string[]} argv
 *
 * @returns {number | undefined}
 */
export function parseExpectedStylelintMajor(argv) {
    const matchingArgument = argv.find((argument) =>
        argument.startsWith(expectedStylelintMajorArgumentPrefix)
    );

    if (matchingArgument === undefined) {
        return undefined;
    }

    const majorString = matchingArgument.slice(
        expectedStylelintMajorArgumentPrefix.length
    );

    if (majorString.length === 0) {
        throw new Error(
            `Missing Stylelint major value in argument: ${matchingArgument}`
        );
    }

    if (!/^[1-9]\d*$/u.test(majorString)) {
        throw new Error(
            `Invalid Stylelint major value in argument: ${matchingArgument}`
        );
    }

    return Number.parseInt(majorString, 10);
}

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
 * @param {unknown} value
 *
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
    return typeof value === "object" && value !== null;
}

/**
 * @param {unknown} value
 *
 * @returns {Record<string, unknown>}
 */
function toRecord(value) {
    return isRecord(value) ? value : {};
}

/**
 * @param {unknown} value
 *
 * @returns {value is StylelintLike}
 */
function hasLintFunction(value) {
    if (typeof value !== "function" && !isRecord(value)) {
        return false;
    }

    return typeof Reflect.get(value, "lint") === "function";
}

/**
 * @param {unknown} error
 *
 * @returns {Error}
 */
function createMissingBuildArtifactsError(error) {
    return new Error(
        "Unable to load built plugin artifacts from dist/. Run `npm run build` before running the Stylelint compatibility smoke check.",
        {
            cause: error instanceof Error ? error : undefined,
        }
    );
}

/**
 * @param {unknown} error
 *
 * @returns {boolean}
 */
function isMissingBuildArtifactsIssue(error) {
    if (!(error instanceof Error)) {
        return false;
    }

    if (
        error.message.includes(
            "Run `npm run build` before running the Stylelint compatibility smoke check."
        )
    ) {
        return false;
    }

    return [
        "dist/plugin.js",
        "dist/plugin.cjs",
        String.raw`dist\plugin.js`,
        String.raw`dist\plugin.cjs`,
    ].some((artifactPath) => error.message.includes(artifactPath));
}

/**
 * @param {unknown} runtimeCandidate
 *
 * @returns {StylelintLike}
 */
export function normalizeStylelintRuntime(runtimeCandidate) {
    if (hasLintFunction(runtimeCandidate)) {
        return runtimeCandidate;
    }

    const moduleRecord = toRecord(runtimeCandidate);
    const defaultRuntimeCandidate = moduleRecord["default"];

    if (hasLintFunction(defaultRuntimeCandidate)) {
        return defaultRuntimeCandidate;
    }

    throw new TypeError("Unable to load a Stylelint runtime with lint().");
}

/**
 * @param {Readonly<{
 *     importModuleFn?: (() => Promise<unknown>) | undefined;
 * }>} [input]
 *
 * @returns {Promise<StylelintLike>}
 */
async function loadStylelintRuntime({
    importModuleFn = () => import("stylelint"),
} = {}) {
    const importedModule = await importModuleFn();

    return normalizeStylelintRuntime(importedModule);
}

/**
 * @param {Readonly<{
 *     readFileSyncFn?: typeof readFileSync;
 *     requireFn?: NodeJS.Require | undefined;
 * }>} [input]
 *
 * @returns {string}
 */
function getStylelintRuntimeVersion({
    readFileSyncFn = readFileSync,
    requireFn = createRequire(import.meta.url),
} = {}) {
    const stylelintPackageJsonPath = requireFn.resolve(
        "stylelint/package.json"
    );
    const packageJsonText = readFileSyncFn(stylelintPackageJsonPath, "utf8");
    const packageJson = /** @type {{ version?: unknown }} */ (
        JSON.parse(packageJsonText)
    );

    if (
        typeof packageJson.version !== "string" ||
        packageJson.version.length === 0
    ) {
        throw new Error("Unable to determine Stylelint runtime version.");
    }

    return packageJson.version;
}

/**
 * @param {number | undefined} expectedMajor
 * @param {Readonly<{
 *     logger?: InfoLogger | undefined;
 *     runtimeVersion: string;
 * }>} input
 *
 * @returns {number}
 */
export function assertStylelintMajor(
    expectedMajor,
    { logger = console, runtimeVersion }
) {
    const [runtimeMajorText] = runtimeVersion.split(".", 1);

    if (runtimeMajorText === undefined || runtimeMajorText.length === 0) {
        throw new Error(
            `Unable to parse Stylelint runtime version: ${runtimeVersion}`
        );
    }

    const runtimeMajor = Number.parseInt(runtimeMajorText, 10);

    if (Number.isNaN(runtimeMajor)) {
        throw new TypeError(
            `Unable to parse Stylelint runtime version: ${runtimeVersion}`
        );
    }

    if (expectedMajor !== undefined && runtimeMajor !== expectedMajor) {
        throw new Error(
            `Expected Stylelint major ${expectedMajor}, but detected ${runtimeVersion}.`
        );
    }

    logger.log(
        `${pc.green("✓")} Stylelint runtime ${pc.bold(runtimeVersion)} detected for compatibility smoke checks.`
    );

    return runtimeMajor;
}

/**
 * @param {unknown} candidate
 *
 * @returns {Readonly<{
 *     allRuleKeys: readonly string[];
 *     configNames: readonly unknown[];
 *     meta: unknown;
 *     recommendedRuleKeys: readonly string[];
 *     ruleIds: readonly unknown[];
 *     ruleKeys: readonly string[];
 *     ruleNames: readonly unknown[];
 * }>}
 */
function createSurfaceSnapshot(candidate) {
    const candidateRecord = toRecord(candidate);
    const pluginConfigsRecord = toRecord(
        candidateRecord["containerQuerySanityPluginConfigs"]
    );
    const allConfigRecord = toRecord(
        pluginConfigsRecord["container-query-all"]
    );
    const recommendedConfigRecord = toRecord(
        pluginConfigsRecord["container-query-recommended"]
    );

    return {
        allRuleKeys: Object.keys(toRecord(allConfigRecord["rules"])),
        configNames: Array.isArray(candidateRecord["configNames"])
            ? candidateRecord["configNames"]
            : [],
        meta: candidateRecord["meta"],
        recommendedRuleKeys: Object.keys(
            toRecord(recommendedConfigRecord["rules"])
        ),
        ruleIds: Array.isArray(candidateRecord["ruleIds"])
            ? candidateRecord["ruleIds"]
            : [],
        ruleKeys: Object.keys(toRecord(candidateRecord["rules"])),
        ruleNames: Array.isArray(candidateRecord["ruleNames"])
            ? candidateRecord["ruleNames"]
            : [],
    };
}

/**
 * @param {Readonly<{
 *     importModuleFn?: (() => Promise<unknown>) | undefined;
 *     requireFn?: NodeJS.Require | undefined;
 * }>} [input]
 *
 * @returns {Promise<BuiltPluginSurface>}
 */
async function loadBuiltPluginSurface({
    // eslint-disable-next-line no-unsanitized/method -- target is either the fixed package name or a fixed internal file URL
    importModuleFn = () => import(builtPluginImportTarget),
    requireFn = createRequire(import.meta.url),
} = {}) {
    try {
        const builtPluginModule =
            /** @type {Readonly<Record<string, unknown>>} */ (
                await importModuleFn()
            );
        const builtPluginCjs = requireFn(builtPluginRequireTarget);

        return {
            builtPluginCjs,
            configNames: /** @type {readonly string[]} */ (
                builtPluginModule["configNames"]
            ),
            containerQuerySanityPluginConfigs:
                /** @type {BuiltPluginConfigs} */ (
                    builtPluginModule["containerQuerySanityPluginConfigs"]
                ),
            meta: /** @type {BuiltPluginSurface["meta"]} */ (
                builtPluginModule["meta"]
            ),
            plugin: /** @type {StylelintConfigPluginArray} */ (
                builtPluginModule["default"]
            ),
            ruleIds: /** @type {readonly string[]} */ (
                builtPluginModule["ruleIds"]
            ),
            ruleNames: /** @type {readonly string[]} */ (
                builtPluginModule["ruleNames"]
            ),
            rules: /** @type {BuiltPluginSurface["rules"]} */ (
                builtPluginModule["rules"]
            ),
        };
    } catch (error) {
        throw createMissingBuildArtifactsError(error);
    }
}

/**
 * Validate the public built plugin surface before running runtime smoke tests.
 *
 * @param {BuiltPluginSurface} surface
 * @param {Readonly<{
 *     logger?: InfoLogger | undefined;
 * }>} [input]
 */
export function assertPluginSurface(surface, { logger = console } = {}) {
    const {
        builtPluginCjs,
        configNames,
        containerQuerySanityPluginConfigs,
        meta,
        plugin,
        ruleIds,
        ruleNames,
        rules,
    } = surface;

    if (!Array.isArray(plugin)) {
        throw new TypeError(
            "Default plugin export must be an array (plugin pack)."
        );
    }

    if (typeof meta.name !== "string" || meta.name.length === 0) {
        throw new TypeError("Plugin metadata is missing a package name.");
    }

    if (meta.namespace !== "container-query-sanity") {
        throw new TypeError(
            `Expected plugin namespace 'container-query-sanity', received '${meta.namespace}'.`
        );
    }

    if (
        !Array.isArray(configNames) ||
        configNames.length === 0 ||
        !Array.isArray(
            containerQuerySanityPluginConfigs["container-query-recommended"]
                .plugins
        ) ||
        !Array.isArray(
            containerQuerySanityPluginConfigs["container-query-all"].plugins
        )
    ) {
        throw new TypeError("Config names export is unavailable.");
    }

    if (ruleNames.length !== ruleIds.length) {
        throw new TypeError("Rule names and rule ids are out of sync.");
    }

    for (const [ruleName, ruleDefinition] of Object.entries(rules)) {
        if (!ruleDefinition.ruleName.includes("/")) {
            throw new TypeError(
                `Rule '${ruleName}' is missing a namespaced ruleName.`
            );
        }
    }

    if (!Array.isArray(builtPluginCjs)) {
        throw new TypeError(
            "Built CommonJS entrypoint must expose the plugin pack as an array."
        );
    }

    if (
        !isDeepStrictEqual(
            createSurfaceSnapshot({
                configNames,
                containerQuerySanityPluginConfigs,
                meta,
                ruleIds,
                ruleNames,
                rules,
            }),
            createSurfaceSnapshot(builtPluginCjs)
        )
    ) {
        throw new TypeError(
            "Built CommonJS entrypoint must preserve named exports alongside the default plugin pack."
        );
    }

    logger.log(
        `${pc.green("✓")} Plugin surface exports are structurally valid.`
    );
}

/**
 * @param {ConfigScenario} scenario
 * @param {Readonly<{
 *     logger?: InfoLogger | undefined;
 *     stylelint: StylelintLike;
 * }>} input
 *
 * @returns {Promise<void>}
 */
export async function runConfigScenario(
    { code, codeFilename, config, name },
    { logger = console, stylelint }
) {
    const lintResult = await stylelint.lint({
        code,
        codeFilename,
        config,
    });
    const [result] = lintResult.results;

    if (result === undefined) {
        throw new Error(`${name}: Stylelint did not return a result.`);
    }

    const parseErrors = result.parseErrors ?? [];
    const invalidOptionWarnings = result.invalidOptionWarnings ?? [];
    const warnings = result.warnings ?? [];

    if (parseErrors.length > 0) {
        throw new Error(
            `${name}: encountered parse errors (${parseErrors.length}).`
        );
    }

    if (invalidOptionWarnings.length > 0) {
        const preview = JSON.stringify(
            invalidOptionWarnings.slice(0, 3),
            null,
            2
        );

        throw new Error(
            `${name}: encountered invalid option warnings (${invalidOptionWarnings.length}). Preview: ${preview}`
        );
    }

    if (warnings.length > 0) {
        throw new Error(
            `${name}: expected zero warnings, received ${warnings.length}.`
        );
    }

    logger.log(`${pc.green("✓")} ${pc.bold(name)} completed without warnings.`);
}

/**
 * @param {Pick<
 *     BuiltPluginSurface,
 *     "containerQuerySanityPluginConfigs" | "plugin"
 * >} input
 *
 * @returns {readonly ConfigScenario[]}
 */
export function createScenarios({ containerQuerySanityPluginConfigs, plugin }) {
    const baselineCssModule = `
.layout {
    --cq-layout-lg: 80rem;
    --cq-layout-md: 40rem;
    container: layout / inline-size;
}

@container layout (var(--cq-layout-md) <= inline-size <= var(--cq-layout-lg)) {
    .card {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
}
`.trim();

    const baselineGlobalCss = `
.layout {
    --cq-layout-xl: 64rem;
    --cq-layout-lg: 50rem;
    --cq-layout-md: 40rem;
    container: layout / inline-size;
}

@container layout (inline-size > var(--cq-layout-md)) {
    .layoutGrid {
        gap: 1rem;
    }
}

@container layout (inline-size >= var(--cq-layout-lg)) {
    @container layout (inline-size >= var(--cq-layout-xl)) {
        .layoutGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
}
`.trim();

    return [
        {
            code: baselineCssModule,
            codeFilename: "Component.module.css",
            config: {
                plugins: Array.from(plugin),
                rules: {},
            },
            name: "direct-plugin-pack-modules",
        },
        {
            code: baselineCssModule,
            codeFilename: "Component.module.css",
            config: {
                ...containerQuerySanityPluginConfigs[
                    "container-query-recommended"
                ],
                plugins: Array.from(
                    containerQuerySanityPluginConfigs[
                        "container-query-recommended"
                    ].plugins
                ),
                rules: {
                    ...containerQuerySanityPluginConfigs[
                        "container-query-recommended"
                    ].rules,
                },
            },
            name: "recommended-config-modules",
        },
        {
            code: baselineCssModule,
            codeFilename: "Component.module.css",
            config: {
                ...containerQuerySanityPluginConfigs["container-query-all"],
                plugins: Array.from(
                    containerQuerySanityPluginConfigs["container-query-all"]
                        .plugins
                ),
                rules: {
                    ...containerQuerySanityPluginConfigs["container-query-all"]
                        .rules,
                },
            },
            name: "all-config-modules",
        },
        {
            code: baselineGlobalCss,
            codeFilename: "src/css/custom.css",
            config: {
                ...containerQuerySanityPluginConfigs[
                    "container-query-recommended"
                ],
                plugins: Array.from(
                    containerQuerySanityPluginConfigs[
                        "container-query-recommended"
                    ].plugins
                ),
                rules: {
                    ...containerQuerySanityPluginConfigs[
                        "container-query-recommended"
                    ].rules,
                },
            },
            name: "recommended-config-global",
        },
        {
            code: baselineGlobalCss,
            codeFilename: "src/css/custom.css",
            config: {
                ...containerQuerySanityPluginConfigs["container-query-all"],
                plugins: Array.from(
                    containerQuerySanityPluginConfigs["container-query-all"]
                        .plugins
                ),
                rules: {
                    ...containerQuerySanityPluginConfigs["container-query-all"]
                        .rules,
                },
            },
            name: "all-config-global",
        },
    ];
}

/**
 * @param {Readonly<{
 *     argv?: readonly string[];
 *     loadBuiltPluginSurfaceFn?:
 *         (() => Promise<BuiltPluginSurface>) | undefined;
 *     loadStylelintFn?: (() => Promise<StylelintLike>) | undefined;
 *     logger?: InfoLogger | undefined;
 *     stylelintRuntimeVersion?: string | undefined;
 * }>} [input]
 *
 * @returns {Promise<void>}
 */
export async function runStylelintCompatSmoke({
    argv = process.argv.slice(2),
    loadBuiltPluginSurfaceFn = loadBuiltPluginSurface,
    loadStylelintFn = loadStylelintRuntime,
    logger = console,
    stylelintRuntimeVersion,
} = {}) {
    const expectedStylelintMajor = parseExpectedStylelintMajor(argv);
    const runtimeVersion =
        stylelintRuntimeVersion ?? getStylelintRuntimeVersion();

    logger.log(
        pc.bold(pc.cyan("Running Stylelint compatibility smoke checks..."))
    );

    assertStylelintMajor(expectedStylelintMajor, {
        logger,
        runtimeVersion,
    });

    const stylelint = await loadStylelintFn();
    const builtPluginSurface = await loadBuiltPluginSurfaceFn().catch(
        (error) => {
            if (isMissingBuildArtifactsIssue(error)) {
                throw createMissingBuildArtifactsError(error);
            }

            throw error;
        }
    );

    assertPluginSurface(builtPluginSurface, { logger });

    for (const scenario of createScenarios({
        containerQuerySanityPluginConfigs:
            builtPluginSurface.containerQuerySanityPluginConfigs,
        plugin: builtPluginSurface.plugin,
    })) {
        await runConfigScenario(scenario, {
            logger,
            stylelint,
        });
    }

    logger.log(
        pc.bold(pc.green("Stylelint compatibility smoke checks passed."))
    );
}

/**
 * @param {Readonly<{
 *     argv?: readonly string[];
 *     logger?: CliLogger | undefined;
 * }>} [input]
 *
 * @returns {Promise<number>}
 */
export async function runCli({
    argv = process.argv.slice(2),
    logger = console,
} = {}) {
    try {
        await runStylelintCompatSmoke({
            argv,
            logger,
        });

        return 0;
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));

        return 1;
    }
}

if (
    isDirectExecution({
        argvEntry: process.argv[1],
        currentImportUrl: import.meta.url,
    })
) {
    const exitCode = await runCli();

    if (exitCode !== 0) {
        process.exitCode = exitCode;
    }
}
