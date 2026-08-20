import { describe, expect, it } from "vitest";

import { parseNpmPackMetadata } from "../scripts/_internal/npm-pack-metadata.mjs";

describe("npm pack metadata parsing", () => {
    it("accepts the legacy array shape", () => {
        expect.hasAssertions();

        expect(
            parseNpmPackMetadata(
                JSON.stringify([{ filename: "example-package-1.0.0.tgz" }])
            )
        ).toStrictEqual({ filename: "example-package-1.0.0.tgz" });
    });

    it("accepts the npm 12 package-keyed object shape", () => {
        expect.hasAssertions();

        expect(
            parseNpmPackMetadata(
                JSON.stringify({
                    "example-package": {
                        filename: "example-package-1.0.0.tgz",
                    },
                })
            )
        ).toStrictEqual({ filename: "example-package-1.0.0.tgz" });
    });

    it.each([
        ["legacy array", "[]"],
        ["package-keyed object", "{}"],
    ])("rejects zero entries in the %s shape", (_shape, packOutput) => {
        expect.hasAssertions();

        expect(() => parseNpmPackMetadata(packOutput)).toThrow(
            "npm pack --json returned 0 metadata entries; expected exactly one."
        );
    });

    it.each([
        [
            "legacy array",
            JSON.stringify([
                { filename: "first.tgz" },
                { filename: "second.tgz" },
            ]),
        ],
        [
            "package-keyed object",
            JSON.stringify({
                first: { filename: "first.tgz" },
                second: { filename: "second.tgz" },
            }),
        ],
    ])("rejects multiple entries in the %s shape", (_shape, packOutput) => {
        expect.hasAssertions();

        expect(() => parseNpmPackMetadata(packOutput)).toThrow(
            "npm pack --json returned 2 metadata entries; expected exactly one."
        );
    });

    it.each([
        [
            "a non-object entry",
            JSON.stringify([null]),
            "must be an object",
        ],
        [
            "a missing filename",
            JSON.stringify([{}]),
            "non-empty filename",
        ],
        [
            "a blank filename",
            JSON.stringify({ package: { filename: " ".repeat(3) } }),
            "non-empty filename",
        ],
    ])("rejects %s", (_caseName, packOutput, expectedMessage) => {
        expect.hasAssertions();

        expect(() => parseNpmPackMetadata(packOutput)).toThrow(expectedMessage);
    });

    it.each([
        ["a parent traversal", "../example-package-1.0.0.tgz"],
        ["a POSIX path", "nested/example-package-1.0.0.tgz"],
        ["a Windows path", String.raw`nested\example-package-1.0.0.tgz`],
        ["surrounding whitespace", " example-package-1.0.0.tgz "],
        ["a non-tarball filename", "example-package-1.0.0.zip"],
    ])("rejects %s in the filename", (_caseName, filename) => {
        expect.hasAssertions();

        expect(() =>
            parseNpmPackMetadata(JSON.stringify([{ filename }]))
        ).toThrow("filename must be a basename ending in .tgz");
    });

    it("rejects an unsupported top-level shape", () => {
        expect.hasAssertions();

        expect(() => parseNpmPackMetadata("null")).toThrow(
            "metadata must be an array or an object keyed by package name"
        );
    });

    it("rejects invalid JSON", () => {
        expect.hasAssertions();

        expect(() => parseNpmPackMetadata("not JSON")).toThrow(
            "npm pack --json returned invalid JSON"
        );
    });
});
