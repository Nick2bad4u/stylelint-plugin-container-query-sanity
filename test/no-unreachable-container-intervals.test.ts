import { describe, expect, it } from "vitest";

import { lintWithConfig } from "./_internal/stylelint-test-helpers";

describe("container-query-sanity/no-unreachable-container-intervals", () => {
    it("reports disjoint nested intervals", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (width >= 60rem) {
                    @container layout (width < 40rem) {
                        .card { display: grid; }
                    }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-unreachable-container-intervals": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]?.text).not.toBe("");
    });

    it("allows nested intervals that can overlap", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (width >= 60rem) {
                    @container layout (width >= 72rem) {
                        .card { display: grid; }
                    }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-unreachable-container-intervals": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(0);
    });

    it("ignores nested queries with different names, features, or units", async () => {
        expect.hasAssertions();

        const result = await lintWithConfig({
            code: `
                @container layout (width >= 60rem) {
                    @container sidebar (width < 40rem) {
                        .different-name { display: grid; }
                    }
                }

                @container layout (width >= 60rem) {
                    @container layout (inline-size < 40rem) {
                        .different-feature { display: grid; }
                    }
                }

                @container layout (width >= 60rem) {
                    @container layout (width < 600px) {
                        .different-unit { display: grid; }
                    }
                }
            `,
            config: {
                rules: {
                    "container-query-sanity/no-unreachable-container-intervals": true,
                },
            },
        });

        expect(result.warnings).toHaveLength(0);
    });
});
