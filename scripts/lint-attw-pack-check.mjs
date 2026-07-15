/**
 * @packageDocumentation
 * Run ATTW package validation using a tar extractor that is robust to multi-chunk gunzip output.
 */
// @ts-check

import { execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";

import { untar } from "@andrewbranch/untar.js";
import { Package, checkPackage } from "@arethetypeswrong/core";
import { Gunzip } from "fflate";

import { parseNpmPackMetadata } from "./_internal/npm-pack-metadata.mjs";

/**
 * @typedef {Readonly<{ filename: string; fileData: Uint8Array }>} TarEntry
 */

/**
 * @param {readonly Uint8Array[]} chunks
 *
 * @returns {Uint8Array}
 */
const concatChunks = (chunks) => {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);

    let offset = 0;

    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    return merged;
};

/**
 * @param {Uint8Array} tarballBytes
 *
 * @returns {TarEntry[]}
 */
const extractTarEntries = (tarballBytes) => {
    /** @type {Uint8Array[]} */
    const chunks = [];

    new Gunzip((chunk) => {
        chunks.push(chunk);
    }).push(tarballBytes, true);

    if (chunks.length === 0) {
        throw new Error(
            "ATTW pack check failed: gzip payload produced no data chunks."
        );
    }

    const mergedChunks = concatChunks(chunks);
    const tarArrayBuffer = new Uint8Array(mergedChunks).buffer;
    const untarredEntries = untar(tarArrayBuffer);

    return untarredEntries.filter(
        (entry) =>
            typeof entry?.filename === "string" &&
            entry.fileData instanceof Uint8Array
    );
};

/**
 * @param {readonly TarEntry[]} entries
 *
 * @returns {string}
 */
const getTarPrefix = (entries) => {
    const [firstEntry] = entries;

    if (firstEntry === undefined) {
        throw new Error("ATTW pack check failed: tarball has no file entries.");
    }

    const slashIndex = firstEntry.filename.indexOf("/");

    if (slashIndex < 0) {
        throw new Error(
            `ATTW pack check failed: unexpected tar entry path '${firstEntry.filename}'.`
        );
    }

    return firstEntry.filename.slice(0, slashIndex + 1);
};

/**
 * @param {readonly TarEntry[]} entries
 * @param {string} prefix
 *
 * @returns {{ name: string; version: string }}
 */
const readManifest = (entries, prefix) => {
    const packageJsonEntry = entries.find(
        (entry) => entry.filename === `${prefix}package.json`
    );

    if (packageJsonEntry === undefined) {
        throw new Error(
            "ATTW pack check failed: package.json is missing from tarball."
        );
    }

    const manifest = /** @type {{ name?: string; version?: string }} */ (
        JSON.parse(new TextDecoder().decode(packageJsonEntry.fileData))
    );

    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
        throw new TypeError(
            "ATTW pack check failed: packed manifest is missing a valid name."
        );
    }

    if (typeof manifest.version !== "string" || manifest.version.length === 0) {
        throw new TypeError(
            "ATTW pack check failed: packed manifest is missing a valid version."
        );
    }

    return {
        name: manifest.name,
        version: manifest.version,
    };
};

/**
 * @param {readonly TarEntry[]} entries
 * @param {string} prefix
 * @param {string} packageName
 *
 * @returns {Record<string, string | Uint8Array>}
 */
const buildAttwFileMap = (entries, prefix, packageName) => {
    /** @type {Record<string, string | Uint8Array>} */
    const files = {};

    for (const entry of entries) {
        const relativePath = entry.filename.startsWith(prefix)
            ? entry.filename.slice(prefix.length)
            : entry.filename;

        files[`/node_modules/${packageName}/${relativePath}`] = entry.fileData;
    }

    return files;
};

/**
 * @returns {string}
 */
const createPackTarball = () => {
    const npmCliPath = process.env["npm_execpath"];

    if (typeof npmCliPath !== "string" || npmCliPath.length === 0) {
        throw new Error(
            "ATTW pack check failed: npm_execpath is not available."
        );
    }

    const packOutput = execFileSync(
        process.execPath,
        [
            npmCliPath,
            "pack",
            "--json",
        ],
        {
            encoding: "utf8",
            env: {
                ...process.env,
                npm_config_loglevel: "error",
            },
        }
    );

    return parseNpmPackMetadata(packOutput).filename;
};

/**
 * @returns {Promise<number>}
 */
const runAttwPackCheck = async () => {
    let tarballFilename = "";

    try {
        tarballFilename = createPackTarball();

        const tarballBytes = new Uint8Array(await readFile(tarballFilename));
        const tarEntries = extractTarEntries(tarballBytes);
        const tarPrefix = getTarPrefix(tarEntries);
        const manifest = readManifest(tarEntries, tarPrefix);
        const files = buildAttwFileMap(tarEntries, tarPrefix, manifest.name);
        const pkg = new Package(files, manifest.name, manifest.version);
        const analysis = await checkPackage(pkg, {});

        if (analysis.types === false) {
            console.error(
                "ATTW package check failed: no type declarations were detected."
            );
            return 1;
        }

        if (analysis.problems.length > 0) {
            console.error("ATTW package check found type export problems:");

            for (const problem of analysis.problems) {
                const resolutionKind =
                    "resolutionKind" in problem
                        ? problem.resolutionKind
                        : "n/a";
                const entrypoint =
                    "entrypoint" in problem ? problem.entrypoint : ".";

                console.error(
                    `- ${problem.kind} | entrypoint=${entrypoint} | resolution=${resolutionKind}`
                );
            }

            return 1;
        }

        console.log("ATTW package check passed.");

        return 0;
    } finally {
        if (tarballFilename.length > 0) {
            await rm(tarballFilename, { force: true });
        }
    }
};

try {
    process.exitCode = await runAttwPackCheck();
} catch (error) {
    console.error("Failed to run ATTW package check:", error);
    process.exitCode = 1;
}
