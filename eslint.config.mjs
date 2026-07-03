import nickTwoBadFourU from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nickTwoBadFourU.configs.all,

    {
        files: ["docs/docusaurus/**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/dot-notation": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unsafe-type-assertion": "off",
            "canonical/filename-no-index": "off",
            "n/no-process-env": "off",
            "perfectionist/sort-imports": "off",
            "perfectionist/sort-jsx-props": "off",
            "perfectionist/sort-object-types": "off",
            "perfectionist/sort-objects": "off",
            "unicorn/escape-case": "off",
            "unicorn/filename-case": "off",
            "unicorn/no-non-function-verb-prefix": "off",
            "unicorn/no-typeof-undefined": "off",
            "unicorn/no-unnecessary-global-this": "off",
            "unicorn/no-unreadable-new-expression": "off",
            "unicorn/no-useless-fallback-in-spread": "off",
            "unicorn/prefer-short-arrow-method": "off",
            "unicorn/prefer-temporal": "off",
            "unicorn/prefer-unicode-code-point-escapes": "off",
            "unicorn/prefer-url-href": "off",
        },
    },

    {
        files: ["docs/docusaurus/site-docs/**/*.md", "docs/rules/**/*.md"],
        rules: {
            "markdown/no-multiple-h1": "off",
        },
    },

    {
        files: ["**/*.toml"],
        name: "Local Stable TOML Formatting",
        rules: {
            // Tombi 1.1.7 formats the same TOML differently on Windows and Linux.
            "tombi/tombi": "off",
        },
    },

    {
        files: ["src/rules/**/*.ts"],
        rules: {
            "unicorn/consistent-boolean-name": "off",
            "unicorn/no-break-in-nested-loop": "off",
            "unicorn/prefer-iterator-to-array": "off",
        },
    },

    {
        files: ["test/**/*.ts"],
        rules: {
            "canonical/no-barrel-import": "off",
            "unicorn/consistent-boolean-name": "off",
            "unicorn/no-break-in-nested-loop": "off",
        },
    },

    {
        files: ["stryker.config.mjs"],
        rules: {
            "@typescript-eslint/dot-notation": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
        },
    },

    {
        files: [
            "knip.config.ts",
            "plugin.d.mts",
            "vitest.stryker.config.ts",
        ],
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        "*.{js,mjs,cjs,ts,mts}",
                        "*.d.mts",
                        ".*.{js,mjs,cjs,ts,mts}",
                    ],
                },
            },
        },
    },
];

export default config;
