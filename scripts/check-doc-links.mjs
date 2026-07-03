#!/usr/bin/env node

/**
 * Documentation link checker with improvements:
 *
 * - PathExists cache
 * - Concurrency limit for file checks
 * - Summary metrics and timing
 * - Deduplicated issues
 * - --max-path-display/--max-path and --concurrency CLI flags
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

import { stripMarkdownCode as stripMarkdownCodeInternal } from "./_internal/strip-markdown-code.mjs";

const argv = process.argv.slice(2);
const isVerbose = argv.includes("--verbose") || argv.includes("-v");
const failFast = argv.includes("--fail-fast") || argv.includes("-f");

/**
 * Parse a positive integer CLI flag in either `--flag=value` or `--flag value`
 * form.
 *
 * @param {readonly string[]} cliArgs
 * @param {string} argumentName
 * @param {number} fallbackValue
 * @param {readonly string[]} [aliases]
 *
 * @returns {number}
 */
export const parsePositiveIntegerFlag = (
    cliArgs,
    argumentName,
    fallbackValue,
    aliases = []
) => {
    const supportedNames = [argumentName, ...aliases];

    for (let index = 0; index < cliArgs.length; index += 1) {
        const argument = cliArgs[index];

        if (typeof argument !== "string") {
            continue;
        }

        const inlineName = supportedNames.find((candidateName) =>
            argument.startsWith(`${candidateName}=`)
        );

        let rawValue;

        if (inlineName !== undefined) {
            rawValue = argument.slice(inlineName.length + 1).trim();
        } else if (supportedNames.includes(argument)) {
            rawValue = cliArgs[index + 1]?.trim() ?? "";
        } else {
            continue;
        }

        if (!/^\d+$/u.test(rawValue)) {
            throw new TypeError(
                `Invalid value for ${argumentName}: ${rawValue || "(empty)"}`
            );
        }

        const parsedValue = Number.parseInt(rawValue, 10);

        if (parsedValue < 1) {
            throw new RangeError(
                `${argumentName} must be a positive integer: ${rawValue}`
            );
        }

        return parsedValue;
    }

    if (!Number.isInteger(fallbackValue) || fallbackValue < 1) {
        throw new RangeError(
            `Fallback value for ${argumentName} must be a positive integer: ${String(fallbackValue)}`
        );
    }

    return fallbackValue;
};

const maxPathDisplay = parsePositiveIntegerFlag(
    argv,
    "--max-path-display",
    50,
    ["--max-path"]
);
const CONCURRENCY = parsePositiveIntegerFlag(argv, "--concurrency", 50);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
const ROOT_DIRECTORY = resolve(currentDirectoryPath, "..");

const DOCS_DIRECTORIES = [
    "docs/rules",
    "docs/docusaurus/site-docs",
    "docs/docusaurus/src/pages",
    "./",
];

const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    ".docusaurus",
    "build",
    "dist",
    ".vite",
    "coverage",
    ".stryker-tmp",
]);

// Capture Markdown links like [text](url) and images ![alt](url).
// NOTE: this intentionally stays lightweight for MDX-heavy docs, so the
// surrounding helpers strip code spans/blocks and normalize destinations.
// eslint-disable-next-line sonarjs/slow-regex -- Lightweight markdown link capture for pre-filtered prose content.
const LINK_PATTERN = /!?\[[^\]]*]\(([^)]+)\)/g;
const HTML_ANCHOR_HREF_PATTERN =
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/giu;

const EXTERNAL_PROTOCOLS = [
    "http:",
    "https:",
    "mailto:",
    "tel:",
    "data:",
    "javascript:",
    "vscode:",
    "file:",
];

/**
 * Truncate safely keeping last `max` codepoints
 *
 * @param {any} str
 * @param {number} max
 */
function truncateEnd(str, max) {
    const chars = [...str];
    return chars.length > max ? "..." + chars.slice(-max).join("") : str;
}

/**
 * @param {import("node:fs").PathLike} entryPath
 */
async function isDirectory(entryPath) {
    try {
        const entryStat = await stat(entryPath);
        return entryStat.isDirectory();
    } catch (error) {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return false;
        }
        throw error;
    }
}

/**
 * @param {string} startDirectory
 */
async function collectMarkdownFiles(startDirectory) {
    const results = [];
    const stack = [startDirectory];

    while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined) continue;
        const entries = await readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const entryName = entry.name;
            if (IGNORED_DIRECTORIES.has(entryName)) continue;
            const entryPath = join(current, entryName);
            if (entry.isDirectory()) {
                stack.push(entryPath);
                continue;
            }
            if (
                entry.isFile() &&
                [".md", ".mdx"].includes(extname(entryName).toLowerCase())
            ) {
                results.push(entryPath);
            }
        }
    }

    return results;
}

/**
 * @param {string} link
 */
function isExternalLink(link) {
    return EXTERNAL_PROTOCOLS.some((protocol) =>
        link.toLowerCase().startsWith(protocol)
    );
}

/**
 * @param {string} link
 */
function isAnchor(link) {
    return link.startsWith("#");
}

/**
 * Strip fenced/inline code segments from markdown prose before link scanning.
 *
 * @param {string} markdown
 *
 * @returns {string}
 */
export function stripMarkdownCode(markdown) {
    return stripMarkdownCodeInternal(markdown);
}

/**
 * Extract markdown links and images from prose content after stripping code.
 *
 * @param {string} content
 *
 * @returns {readonly RegExpMatchArray[]}
 */
export function extractMarkdownLinkMatches(content) {
    return Array.from(stripMarkdownCode(content).matchAll(LINK_PATTERN));
}

/**
 * Extract raw HTML anchor destinations from prose content after stripping code.
 *
 * @param {string} content
 *
 * @returns {readonly string[]}
 */
export function extractHtmlAnchorLinks(content) {
    return Array.from(
        stripMarkdownCode(content).matchAll(HTML_ANCHOR_HREF_PATTERN),
        (match) => match[1] ?? match[2] ?? match[3] ?? ""
    ).filter((link) => link.length > 0);
}

/**
 * Remove optional markdown inline-link titles from a captured destination.
 *
 * @param {string} rawLink
 *
 * @returns {string}
 */
export function stripOptionalMarkdownLinkTitle(rawLink) {
    const trimmedLink = rawLink.trim();

    if (trimmedLink.startsWith("<")) {
        const closingAngleBracketOffset = trimmedLink.indexOf(">", 1);

        if (closingAngleBracketOffset !== -1) {
            return trimmedLink.slice(1, closingAngleBracketOffset).trim();
        }
    }

    let parenthesisDepth = 0;
    let isEscaped = false;

    for (const [characterOffset, character] of [...trimmedLink].entries()) {
        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (character === "\\") {
            isEscaped = true;
            continue;
        }

        if (character === "(") {
            parenthesisDepth += 1;
            continue;
        }

        if (character === ")" && parenthesisDepth > 0) {
            parenthesisDepth -= 1;
            continue;
        }

        if (/\s/u.test(character) && parenthesisDepth === 0) {
            return trimmedLink.slice(0, characterOffset).trim();
        }
    }

    return trimmedLink;
}

/**
 * @param {string} rawLink
 */
export function normalizeLink(rawLink) {
    const linkWithoutTitle = stripOptionalMarkdownLinkTitle(rawLink);
    const [pathPart] = linkWithoutTitle.split("#");
    if (!pathPart) return "";
    const [cleanPath] = pathPart.split("?");
    if (!cleanPath) return "";
    return cleanPath.trim();
}

/**
 * Cache results of file existence checks.
 */
const pathIsFileCache = new Map();

const pathExistsAsFile = async (
    /** @type {import("node:fs").PathLike} */ pathToCheck
) => {
    if (pathIsFileCache.has(pathToCheck)) {
        return pathIsFileCache.get(pathToCheck);
    }
    try {
        const pathStats = await stat(pathToCheck);
        const isFilePath = pathStats.isFile();

        pathIsFileCache.set(pathToCheck, isFilePath);
        return isFilePath;
    } catch {
        pathIsFileCache.set(pathToCheck, false);
        return false;
    }
};

export const getPathCandidates = (
    /** @type {string} */ markdownPath,
    /** @type {string} */ normalizedLink
) => {
    const markdownDirectoryPath = dirname(markdownPath);
    const basePath = resolve(markdownDirectoryPath, normalizedLink);
    const hasKnownExtension = [
        ".md",
        ".mdx",
        ".html",
    ].includes(extname(basePath).toLowerCase());

    if (hasKnownExtension) {
        return [basePath];
    }

    return [
        basePath,
        `${basePath}.md`,
        `${basePath}.mdx`,
        resolve(basePath, "index.md"),
        resolve(basePath, "index.mdx"),
        resolve(basePath, "README.md"),
    ];
};

/**
 * Resolve the first filesystem-backed file candidate for a normalized link.
 *
 * @param {string} markdownPath
 * @param {string} normalizedLink
 *
 * @returns {Promise<string | undefined>}
 */
export async function resolveExistingPathCandidate(
    markdownPath,
    normalizedLink
) {
    const pathCandidates = getPathCandidates(markdownPath, normalizedLink);

    for (const candidatePath of pathCandidates) {
        if (await pathExistsAsFile(candidatePath)) {
            return candidatePath;
        }
    }

    return undefined;
}

/**
 * Validate a single link and push to issues if broken. Returns true if broken
 * (so caller can optionally fail-fast).
 *
 * @param {any} markdownPath
 * @param {string} link
 * @param {{ file: any; link: any; resolvedPath: string }[]} issues
 * @param {{ has: (arg0: string) => any; add: (arg0: string) => void }} issueSet
 * @param {{
 *     totalLinksChecked: number;
 *     emptyLinks: number;
 *     anchorsIgnored: number;
 *     externalLinksIgnored: number;
 *     appRouteLinksIgnored: number;
 *     brokenLinks: number;
 * }} metrics
 */
async function validateLink(markdownPath, link, issues, issueSet, metrics) {
    metrics.totalLinksChecked++;
    const trimmedLink = link.trim();

    if (trimmedLink.length === 0) {
        metrics.emptyLinks++;
        return false;
    }

    if (isAnchor(trimmedLink)) {
        metrics.anchorsIgnored++;
        return false;
    }

    const normalized = normalizeLink(trimmedLink);

    if (normalized.length === 0) {
        metrics.emptyLinks++;
        return false;
    }
    if (isExternalLink(normalized)) {
        metrics.externalLinksIgnored++;
        return false;
    }
    if (normalized.startsWith("/")) {
        // App route, skip
        metrics.appRouteLinksIgnored++;
        return false;
    }

    const resolvedCandidatePath = await resolveExistingPathCandidate(
        markdownPath,
        normalized
    );

    if (resolvedCandidatePath !== undefined) {
        return false;
    }

    const pathCandidates = getPathCandidates(markdownPath, normalized);

    const key = `${markdownPath}|${link}`;
    if (!issueSet.has(key)) {
        issueSet.add(key);
        issues.push({
            file: markdownPath,
            link,
            resolvedPath: pathCandidates[0] ?? normalized,
        });
        metrics.brokenLinks++;
    }
    return true;
}

/**
 * @param {import("node:fs").PathLike | import("node:fs/promises").FileHandle} markdownPath
 * @param {{ file: string; link: string; resolvedPath: string }[]} issues
 * @param {Set<string>} issueSet
 * @param {{
 *     totalFilesChecked: number;
 *     totalLinksChecked: number;
 *     brokenLinks: number;
 *     externalLinksIgnored: number;
 *     anchorsIgnored: number;
 *     appRouteLinksIgnored: number;
 *     imageLinksIgnored: number;
 *     emptyLinks: number;
 *     filesWithLinks: number;
 *     filesWithNoLinks: number;
 * }} metrics
 */
async function checkFile(markdownPath, issues, issueSet, metrics) {
    if (isVerbose) {
        console.log(
            pc.cyan("Scanning: ") +
                pc.magenta(truncateEnd(markdownPath, maxPathDisplay))
        );
    }

    const content = await readFile(markdownPath, "utf8");
    const strippedContent = stripMarkdownCode(content);
    const matches = Array.from(strippedContent.matchAll(LINK_PATTERN));
    const htmlAnchorLinks = Array.from(
        strippedContent.matchAll(HTML_ANCHOR_HREF_PATTERN),
        (match) => match[1] ?? match[2] ?? match[3] ?? ""
    ).filter((link) => link.length > 0);

    if (matches.length === 0) {
        metrics.filesWithNoLinks++;
    } else {
        metrics.filesWithLinks++;
    }

    for (const match of matches) {
        const fullMatch = match[0];
        const link = match[1];
        if (fullMatch.startsWith("!")) {
            metrics.imageLinksIgnored++;
            continue;
        }
        if (link) {
            const broken = await validateLink(
                markdownPath,
                link,
                issues,
                issueSet,
                metrics
            );
            if (broken && failFast) {
                throw new Error("Fail-fast triggered due to broken link");
            }
        }
    }

    for (const link of htmlAnchorLinks) {
        const broken = await validateLink(
            markdownPath,
            link,
            issues,
            issueSet,
            metrics
        );

        if (broken && failFast) {
            throw new Error("Fail-fast triggered due to broken link");
        }
    }
}

/**
 * Split array into batches
 *
 * @param {readonly string[]} array
 * @param {number} size
 *
 * @returns {string[][]}
 */
function batches(array, size) {
    const out = [];
    for (let i = 0; i < array.length; i += size) {
        out.push(array.slice(i, i + size));
    }
    return out;
}

/**
 * Main entry point for documentation link checking.
 *
 * Collects markdown files, checks links, aggregates issues and metrics, and
 * prints summary results.
 *
 * Handles concurrency, fail-fast, and verbose options.
 *
 * @returns {Promise<void>}
 */
async function main() {
    /**
     * @type {any[]}
     */
    const issues = [];
    const issueSet = new Set();

    // Metrics

    /**
     * All metrics properties must be initialized as numbers (not possibly
     * undefined) to satisfy validateLink's type requirements.
     */
    /**
     * @type {{
     *     totalFilesChecked: number;
     *     totalLinksChecked: number;
     *     brokenLinks: number;
     *     externalLinksIgnored: number;
     *     anchorsIgnored: number;
     *     appRouteLinksIgnored: number;
     *     imageLinksIgnored: number;
     *     emptyLinks: number;
     *     filesWithLinks: number;
     *     filesWithNoLinks: number;
     * }}
     */
    const metrics = {
        totalFilesChecked: 0,
        totalLinksChecked: 0,
        brokenLinks: 0,
        externalLinksIgnored: 0,
        anchorsIgnored: 0,
        appRouteLinksIgnored: 0,
        imageLinksIgnored: 0,
        emptyLinks: 0,
        filesWithLinks: 0,
        filesWithNoLinks: 0,
    };

    const startTime = Date.now();

    for (const directory of DOCS_DIRECTORIES) {
        const absoluteDirectory = resolve(ROOT_DIRECTORY, directory);

        if (!(await isDirectory(absoluteDirectory))) {
            if (isVerbose) {
                console.log(
                    pc.yellow(
                        `Skipping non-existent directory: ${absoluteDirectory}`
                    )
                );
            }
            continue;
        }

        if (isVerbose) {
            console.log(
                pc.cyan(`Collecting markdown files in: ${absoluteDirectory}`)
            );
        }

        const markdownFiles = await collectMarkdownFiles(absoluteDirectory);
        metrics.totalFilesChecked += markdownFiles.length;

        // Process files in batches to limit concurrency
        for (const batch of batches(markdownFiles, CONCURRENCY)) {
            await Promise.all(
                batch.map((file) => checkFile(file, issues, issueSet, metrics))
            );
        }
    }

    const elapsedMs = Date.now() - startTime;

    if (issues.length > 0) {
        console.error(pc.red("Broken documentation links detected:\n"));
        for (const issue of issues) {
            console.error(
                pc.red(`• ${issue.file}`) +
                    pc.gray(" -> ") +
                    pc.yellow(issue.link) +
                    pc.gray(" (resolved path: ") +
                    pc.magenta(issue.resolvedPath) +
                    pc.gray(")")
            );
        }
        console.error(
            pc.red(
                `\nTotal broken links: ${metrics.brokenLinks}. Please fix the links above.`
            )
        );
        // Summary
        console.error(pc.gray(`Files checked: ${metrics.totalFilesChecked}`));
        console.error(pc.gray(`Links checked: ${metrics.totalLinksChecked}`));
        console.error(
            pc.gray(`External links ignored: ${metrics.externalLinksIgnored}`)
        );
        console.error(pc.gray(`Anchors ignored: ${metrics.anchorsIgnored}`));
        console.error(pc.gray(`Elapsed: ${(elapsedMs / 1000).toFixed(2)}s`));
        process.exit(1);
    }

    console.log(
        pc.green("Documentation link check passed – no broken links found.")
    );
    console.log(pc.gray(`Files checked: ${metrics.totalFilesChecked}`));
    console.log(pc.gray(`Links checked: ${metrics.totalLinksChecked}`));
    console.log(
        pc.gray(`External links ignored: ${metrics.externalLinksIgnored}`)
    );
    console.log(pc.gray(`Anchors ignored: ${metrics.anchorsIgnored}`));
    console.log(pc.gray(`Elapsed: ${(elapsedMs / 1000).toFixed(2)}s`));
}

if (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === currentFilePath
) {
    try {
        await main();
    } catch (error) {
        console.error(
            pc.red(
                "Documentation link check failed due to an unexpected error."
            )
        );
        console.error(error);
        process.exit(1);
    }
}
