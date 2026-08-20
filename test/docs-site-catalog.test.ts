import { readdirSync } from "node:fs";
import * as path from "node:path";
import { setHas } from "ts-extras";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import-x/extensions -- Node JSON module imports require the explicit filename extension.
import packageJson from "../package.json" with { type: "json" };
import { configNames, ruleNames } from "../src/plugin";

const sortLexicographically = (
    values: readonly string[]
): readonly string[] => {
    const sortedValues: string[] = [];

    for (const value of values) {
        const earlierValueIndex = sortedValues.findIndex(
            (sortedValue) => value.localeCompare(sortedValue) < 0
        );
        const insertionOffset =
            earlierValueIndex === -1 ? sortedValues.length : earlierValueIndex;

        sortedValues.splice(insertionOffset, 0, value);
    }

    return sortedValues;
};

describe("docs site catalog metadata", () => {
    it("builds config inspectors from pinned local dependencies", () => {
        expect.hasAssertions();

        const eslintInspectorScript =
            packageJson.scripts["build:eslint-inspector"];
        const stylelintInspectorScript =
            packageJson.scripts["build:stylelint-inspector"];

        expect(eslintInspectorScript).toMatch(/^eslint-config-inspector /v);
        expect(stylelintInspectorScript).toMatch(
            /^stylelint-config-inspector /v
        );
        expect(eslintInspectorScript).not.toContain("@latest");
        expect(stylelintInspectorScript).not.toContain("@latest");
        expect(packageJson.devDependencies["@eslint/config-inspector"]).toBe(
            "^3.3.0"
        );
        expect(packageJson.devDependencies["stylelint-config-inspector"]).toBe(
            "^2.3.5"
        );
    });

    it("keeps authored docs aligned with plugin exports", () => {
        expect.hasAssertions();

        const rulesDocsDirectory = path.join(process.cwd(), "docs", "rules");
        const configDocsDirectory = path.join(rulesDocsDirectory, "configs");
        const configNameSet = new Set(configNames);
        const ruleDocIds = readdirSync(rulesDocsDirectory, {
            withFileTypes: true,
        })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map((entry) => entry.name.replace(/\.md$/v, ""))
            .filter((docId) => ruleNames.includes(docId));
        const configDocIds = readdirSync(configDocsDirectory, {
            withFileTypes: true,
        })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map((entry) => entry.name.replace(/\.md$/v, ""))
            .filter((docId) => setHas(configNameSet, docId))
            .map((docId) => `configs/${docId}`);

        expect(ruleDocIds).toHaveLength(ruleNames.length);
        expect(ruleDocIds).not.toContain("__missing__");
        expect(sortLexicographically(ruleDocIds)).toStrictEqual([...ruleNames]);
        expect(configDocIds).toHaveLength(configNames.length);
        expect(sortLexicographically(configDocIds)).toStrictEqual(
            sortLexicographically(
                configNames.map((configName) => `configs/${configName}`)
            )
        );
    });
});
