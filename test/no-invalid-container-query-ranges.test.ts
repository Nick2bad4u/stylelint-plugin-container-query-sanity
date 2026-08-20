import { describe, expect, it } from "vitest";

import { lintWithConfig } from "./_internal/stylelint-test-helpers";

describe("container-query-sanity/no-invalid-container-query-ranges", () => {
    it("reports contradictory ranges", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (width > 60rem) and (width < 40rem) {
                    .card { display: grid; }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-invalid-container-query-ranges": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]?.text).not.toBe("");
    });

    it("reports mixed units in one range", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (30rem <= width <= 700px) {
                    .card { display: grid; }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-invalid-container-query-ranges": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(1);
    });

    it("ignores empty parenthesized conditions", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (   ) {
                    .card { display: grid; }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-invalid-container-query-ranges": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(0);
    });
});
