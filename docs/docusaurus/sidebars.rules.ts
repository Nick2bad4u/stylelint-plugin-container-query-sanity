import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const packageName = "stylelint-plugin-container-query-sanity";
const generatedIndexType = "generated-index" as const;

const sidebars: SidebarsConfig = {
    rules: [
        {
            className: "sb-doc-overview",
            id: "overview",
            label: "📍 Overview",
            type: "doc",
        },
        {
            className: "sb-doc-getting-started",
            id: "getting-started",
            label: "🚀 Getting Started",
            type: "doc",
        },
        {
            className: "sb-cat-configs",
            collapsed: true,
            customProps: {
                badge: "configs",
            },
            items: [
                {
                    className: "sb-config-recommended",
                    id: "configs/container-query-recommended",
                    label: "🟡 Recommended",
                    type: "doc",
                },
                {
                    className: "sb-config-strict",
                    id: "configs/container-query-strict",
                    label: "🔴 Strict",
                    type: "doc",
                },
                {
                    className: "sb-config-all",
                    id: "configs/container-query-all",
                    label: "🟣 All",
                    type: "doc",
                },
            ],
            label: "🧰 Configs",
            link: {
                id: "configs/index",
                type: "doc",
            },
            type: "category",
        },
        {
            className: "sb-cat-guides",
            collapsed: true,
            customProps: {
                badge: "guides",
            },
            items: [
                {
                    id: "guides/current-status",
                    label: "📈 Current Status",
                    type: "doc",
                },
            ],
            label: "🛡️ Adoption & Rollout",
            link: {
                description: `Migration and release-readiness guidance for ${packageName}.`,
                slug: "/category/adoption--rollout",
                title: "Adoption & Rollout",
                type: generatedIndexType,
            },
            type: "category",
        },
        {
            className: "sb-cat-rules",
            collapsed: false,
            customProps: {
                badge: "rules",
            },
            items: [
                {
                    className: "sb-cat-rules-names",
                    collapsed: true,
                    collapsible: true,
                    items: [
                        {
                            id: "require-named-container",
                            label: "require-named-container",
                            type: "doc",
                        },
                        {
                            id: "no-unknown-container-names",
                            label: "no-unknown-container-names",
                            type: "doc",
                        },
                        {
                            id: "require-container-type-for-named-containers",
                            label: "require-container-type-for-named-containers",
                            type: "doc",
                        },
                        {
                            id: "no-conflicting-container-name-declarations",
                            label: "no-conflicting-container-name-declarations",
                            type: "doc",
                        },
                    ],
                    label: "🏷️ Named Container Contracts",
                    link: {
                        description:
                            "Rules that keep named container declarations and queries aligned.",
                        slug: "/category/named-container-contracts",
                        title: "Named Container Contracts",
                        type: generatedIndexType,
                    },
                    type: "category",
                },
                {
                    className: "sb-cat-rules-ranges",
                    collapsed: true,
                    collapsible: true,
                    items: [
                        {
                            id: "no-invalid-container-query-ranges",
                            label: "no-invalid-container-query-ranges",
                            type: "doc",
                        },
                        {
                            id: "no-unreachable-container-intervals",
                            label: "no-unreachable-container-intervals",
                            type: "doc",
                        },
                        {
                            id: "no-degenerate-container-query-conditions",
                            label: "no-degenerate-container-query-conditions",
                            type: "doc",
                        },
                        {
                            id: "prefer-range-syntax",
                            label: "prefer-range-syntax",
                            type: "doc",
                        },
                    ],
                    label: "📏 Query Range Sanity",
                    link: {
                        description:
                            "Rules that catch invalid, unreachable, or low-signal container query ranges.",
                        slug: "/category/query-range-sanity",
                        title: "Query Range Sanity",
                        type: generatedIndexType,
                    },
                    type: "category",
                },
                {
                    className: "sb-cat-rules-containment",
                    collapsed: true,
                    collapsible: true,
                    items: [
                        {
                            id: "no-size-query-on-non-size-container",
                            label: "no-size-query-on-non-size-container",
                            type: "doc",
                        },
                        {
                            id: "no-block-axis-query-on-inline-size-container",
                            label: "no-block-axis-query-on-inline-size-container",
                            type: "doc",
                        },
                        {
                            id: "no-scroll-state-query-on-non-scroll-state-container",
                            label: "no-scroll-state-query-on-non-scroll-state-container",
                            type: "doc",
                        },
                        {
                            id: "prefer-logical-size-features",
                            label: "prefer-logical-size-features",
                            type: "doc",
                        },
                    ],
                    label: "🧱 Containment & Feature Matching",
                    link: {
                        description:
                            "Rules that verify query features match declared container capabilities.",
                        slug: "/category/containment--feature-matching",
                        title: "Containment & Feature Matching",
                        type: generatedIndexType,
                    },
                    type: "category",
                },
                {
                    className: "sb-cat-rules-tokens",
                    collapsed: true,
                    collapsible: true,
                    items: [
                        {
                            id: "require-breakpoint-token-usage",
                            label: "require-breakpoint-token-usage",
                            type: "doc",
                        },
                    ],
                    label: "🪙 Breakpoint Token Discipline",
                    link: {
                        description:
                            "Rules that keep query thresholds tied to approved design tokens.",
                        slug: "/category/breakpoint-token-discipline",
                        title: "Breakpoint Token Discipline",
                        type: generatedIndexType,
                    },
                    type: "category",
                },
            ],
            label: "🧭 Rules",
            link: {
                description:
                    "Rule documentation for every container-query-sanity rule.",
                slug: "/",
                title: "Rule Reference",
                type: generatedIndexType,
            },
            type: "category",
        },
    ],
} satisfies SidebarsConfig;

export default sidebars;
