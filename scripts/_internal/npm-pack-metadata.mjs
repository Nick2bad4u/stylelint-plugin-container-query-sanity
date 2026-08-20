// @ts-check

/**
 * @typedef {Readonly<{ filename: string }>} NpmPackMetadata
 */

/**
 * Normalize the metadata emitted by `npm pack --json` across supported npm
 * versions.
 *
 * Npm 11 and earlier return an array, while npm 12 returns an object keyed by
 * package name. A single-package validation run must produce exactly one
 * metadata entry in either shape.
 *
 * @param {unknown} metadata
 *
 * @returns {NpmPackMetadata}
 */
const normalizeNpmPackMetadata = (metadata) => {
    /** @type {unknown[]} */
    let entries;

    if (Array.isArray(metadata)) {
        entries = metadata;
    } else if (metadata !== null && typeof metadata === "object") {
        entries = Object.values(metadata);
    } else {
        throw new TypeError(
            "ATTW pack check failed: npm pack --json metadata must be an array or an object keyed by package name."
        );
    }

    if (entries.length !== 1) {
        throw new Error(
            `ATTW pack check failed: npm pack --json returned ${entries.length} metadata entries; expected exactly one.`
        );
    }

    const [entry] = entries;

    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        throw new TypeError(
            "ATTW pack check failed: npm pack --json metadata entry must be an object."
        );
    }

    if (
        !("filename" in entry) ||
        typeof entry.filename !== "string" ||
        entry.filename.trim().length === 0
    ) {
        throw new TypeError(
            "ATTW pack check failed: npm pack --json metadata entry must include a non-empty filename."
        );
    }

    const filename = entry.filename.trim();

    if (
        filename !== entry.filename ||
        filename === "." ||
        filename === ".." ||
        filename.includes("/") ||
        filename.includes("\\") ||
        !filename.endsWith(".tgz")
    ) {
        throw new TypeError(
            "ATTW pack check failed: npm pack --json filename must be a basename ending in .tgz."
        );
    }

    return { filename };
};

/**
 * Parse and normalize the output from `npm pack --json`.
 *
 * @param {string} packOutput
 *
 * @returns {NpmPackMetadata}
 */
export const parseNpmPackMetadata = (packOutput) => {
    /** @type {unknown} */
    let parsed;

    try {
        parsed = JSON.parse(packOutput);
    } catch (error) {
        throw new Error(
            "ATTW pack check failed: npm pack --json returned invalid JSON.",
            { cause: error }
        );
    }

    return normalizeNpmPackMetadata(parsed);
};
