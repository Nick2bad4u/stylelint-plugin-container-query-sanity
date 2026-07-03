import { themes as prismThemes } from "prism-react-renderer";

import type { Config, PluginModule } from "@docusaurus/types";
import type { Options as DocsPluginOptions } from "@docusaurus/plugin-content-docs";
import type * as Preset from "@docusaurus/preset-classic";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const organizationName = "Nick2bad4u";
const projectName = "stylelint-plugin-container-query-sanity";
const siteOrigin = "https://nick2bad4u.github.io";
const baseUrl =
    process.env["DOCUSAURUS_BASE_URL"] ??
    "/stylelint-plugin-container-query-sanity/";
const siteUrl = `${siteOrigin}${baseUrl}`;
const enableExperimentalFaster =
    process.env["DOCUSAURUS_ENABLE_EXPERIMENTAL"] === "true";

const siteDescription =
    "Stylelint rules and shareable configs for validating container query names, ranges, containment contracts, and breakpoint token usage.";
const projectBlogDescription = `Release notes, architecture notes, and practical guidance for ${projectName} users.`;
const projectTagline =
    "Stylelint rules for named containers, range sanity, and breakpoint token discipline.";
const projectKeywords =
    "stylelint, stylelint plugin, css container queries, container query linting, css linting, responsive design, design tokens";
const socialCardImagePath = "img/logo.png";
const socialCardImageUrl = new URL(socialCardImagePath, siteUrl).toString();
const modernEnhancementsClientModule = fileURLToPath(
    new URL("src/js/modernEnhancements.ts", import.meta.url)
);

const pwaThemeColor = "#2b2118";
const pwaTileColor = "#2b2118";
const pwaMaskIconColor = "#f59e0b";
const footerCopyright =
    `© ${new Date().getFullYear()} ` +
    '<a href="https://github.com/Nick2bad4u/" target="_blank" rel="noopener noreferrer">Nick2bad4u</a> · Built with ' +
    '<a href="https://docusaurus.io/" target="_blank" rel="noopener noreferrer">Docusaurus</a>.';

const removeHeadAttributeFlagKey = [
    "remove",
    "LegacyPostBuildHeadAttribute",
].join("");

const requireFromDocsWorkspace = createRequire(import.meta.url);

const resolveOptionalModule = (moduleSpecifier: string): string | undefined => {
    try {
        return requireFromDocsWorkspace.resolve(moduleSpecifier);
    } catch {
        return undefined;
    }
};

const vscodeCssLanguageServiceEsmEntry = resolveOptionalModule(
    "vscode-css-languageservice/lib/esm/cssLanguageService.js"
);
const vscodeLanguageServerTypesEsmEntry = resolveOptionalModule(
    "vscode-languageserver-types/lib/esm/main.js"
);

const suppressKnownWebpackWarningsPlugin: PluginModule = () => ({
    configureWebpack() {
        return {
            ignoreWarnings: [
                (warning: unknown) => {
                    const warningRecord = warning as
                        Readonly<Record<string, unknown>> | undefined;
                    const warningMessage = warningRecord?.["message"];

                    return (
                        typeof warningMessage === "string" &&
                        warningMessage.includes(
                            "Critical dependency: require function is used in a way in which dependencies cannot be statically extracted"
                        )
                    );
                },
            ],
            resolve: {
                alias: {
                    ...(vscodeCssLanguageServiceEsmEntry !== undefined && {
                        "vscode-css-languageservice$":
                            vscodeCssLanguageServiceEsmEntry,
                    }),
                    ...(vscodeLanguageServerTypesEsmEntry !== undefined && {
                        "vscode-languageserver-types$":
                            vscodeLanguageServerTypesEsmEntry,
                        "vscode-languageserver-types/lib/umd/main.js$":
                            vscodeLanguageServerTypesEsmEntry,
                    }),
                },
            },
        };
    },
    name: "suppress-known-webpack-warnings",
});

const futureConfig = {
    ...(enableExperimentalFaster && {
        faster: {
            mdxCrossCompilerCache: true,
            rspackBundler: true,
            rspackPersistentCache: true,
            ssgWorkerThreads: true,
        },
    }),
    v4: {
        [removeHeadAttributeFlagKey]: true,
        fasterByDefault: false,
        mdx1CompatDisabledByDefault: true,
        removeLegacyPostBuildHeadAttribute: true,
        siteStorageNamespacing: true,
        useCssCascadeLayers: false,
    },
} satisfies Config["future"];

const config = {
    baseUrl,
    baseUrlIssueBanner: true,
    clientModules: [modernEnhancementsClientModule],
    deploymentBranch: "gh-pages",
    favicon: "img/favicon.svg",
    future: futureConfig,
    headTags: [
        {
            attributes: {
                href: siteOrigin,
                rel: "preconnect",
            },
            tagName: "link",
        },
        {
            attributes: {
                href: "https://github.com",
                rel: "preconnect",
            },
            tagName: "link",
        },
        {
            attributes: {
                type: "application/ld+json",
            },
            innerHTML: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareSourceCode",
                codeRepository: `https://github.com/${organizationName}/${projectName}`,
                description: siteDescription,
                image: socialCardImageUrl,
                license: `https://github.com/${organizationName}/${projectName}/blob/main/LICENSE`,
                name: projectName,
                programmingLanguage: "TypeScript",
                runtimePlatform: "Node.js",
                url: siteUrl,
            }),
            tagName: "script",
        },
    ],
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },
    markdown: {
        anchors: {
            maintainCase: true,
        },
        emoji: true,
        format: "detect",
        hooks: {
            onBrokenMarkdownImages: "warn",
            onBrokenMarkdownLinks: "warn",
        },
        mermaid: true,
    },
    noIndex: false,
    onBrokenAnchors: "warn",
    onBrokenLinks: "warn",
    onDuplicateRoutes: "warn",
    organizationName,
    plugins: [
        suppressKnownWebpackWarningsPlugin,
        "docusaurus-plugin-image-zoom",
        [
            "@docusaurus/plugin-pwa",
            {
                debug: process.env["DOCUSAURUS_PWA_DEBUG"] === "true",
                offlineModeActivationStrategies: [
                    "appInstalled",
                    "standalone",
                    "queryString",
                ],
                pwaHead: [
                    {
                        href: `${baseUrl}manifest.json`,
                        rel: "manifest",
                        tagName: "link",
                    },
                    {
                        content: pwaThemeColor,
                        name: "theme-color",
                        tagName: "meta",
                    },
                    {
                        content: "yes",
                        name: "apple-mobile-web-app-capable",
                        tagName: "meta",
                    },
                    {
                        content: "black-translucent",
                        name: "apple-mobile-web-app-status-bar-style",
                        tagName: "meta",
                    },
                    {
                        href: `${baseUrl}img/logo-192x192.png`,
                        rel: "apple-touch-icon",
                        tagName: "link",
                    },
                    {
                        color: pwaMaskIconColor,
                        href: `${baseUrl}img/logo.svg`,
                        rel: "mask-icon",
                        tagName: "link",
                    },
                    {
                        content: `${baseUrl}img/logo-192x192.png`,
                        name: "msapplication-TileImage",
                        tagName: "meta",
                    },
                    {
                        content: pwaTileColor,
                        name: "msapplication-TileColor",
                        tagName: "meta",
                    },
                ],
            },
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/`,
                id: "rules",
                path: "../rules",
                routeBasePath: "docs/rules",
                showLastUpdateAuthor: true,
                showLastUpdateTime: true,
                sidebarPath: "./sidebars.rules.ts",
            } satisfies DocsPluginOptions,
        ],
    ],
    presets: [
        [
            "classic",
            {
                blog: {
                    blogDescription: projectBlogDescription,
                    blogSidebarCount: "ALL",
                    blogSidebarTitle: "All posts",
                    blogTitle: `${projectName} Blog`,
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    feedOptions: {
                        copyright: `© ${new Date().getFullYear()} Nick2bad4u`,
                        description: projectBlogDescription,
                        language: "en",
                        title: `${projectName} Blog`,
                        type: ["rss", "atom"],
                        xslt: true,
                    },
                    onInlineAuthors: "warn",
                    onInlineTags: "warn",
                    onUntruncatedBlogPosts: "warn",
                    postsPerPage: 10,
                    showReadingTime: true,
                },
                docs: {
                    breadcrumbs: true,
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    onInlineTags: "ignore",
                    path: "site-docs",
                    routeBasePath: "docs",
                    showLastUpdateAuthor: true,
                    showLastUpdateTime: true,
                    sidebarCollapsed: true,
                    sidebarCollapsible: true,
                    sidebarPath: "./sidebars.ts",
                },
                pages: {
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    exclude: [
                        "**/*.d.ts",
                        "**/*.d.tsx",
                        "**/__tests__/**",
                        "**/*.test.{js,jsx,ts,tsx}",
                        "**/*.spec.{js,jsx,ts,tsx}",
                    ],
                    include: ["**/*.{js,jsx,ts,tsx,md,mdx}"],
                    mdxPageComponent: "@theme/MDXPage",
                    path: "src/pages",
                    routeBasePath: "/",
                    showLastUpdateAuthor: true,
                    showLastUpdateTime: true,
                },
                sitemap: {
                    filename: "sitemap.xml",
                    lastmod: "datetime",
                },
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],
    projectName,
    staticDirectories: ["static"],
    storage: {
        namespace: true,
        type: "localStorage",
    },
    tagline: projectTagline,
    themeConfig: {
        colorMode: {
            defaultMode: "dark",
            disableSwitch: false,
            respectPrefersColorScheme: true,
        },
        footer: {
            copyright: footerCopyright,
            links: [
                {
                    items: [
                        {
                            label: "📍 Overview",
                            to: "/docs/rules/overview",
                        },
                        {
                            label: "🚀 Getting Started",
                            to: "/docs/rules/getting-started",
                        },
                        {
                            label: "Configs",
                            to: "/docs/rules/configs",
                        },
                        {
                            label: "Rule Reference",
                            to: "/docs/rules",
                        },
                    ],
                    title: "Explore",
                },
                {
                    items: [
                        {
                            href: `https://github.com/${organizationName}/${projectName}/releases`,
                            label: "Releases",
                        },
                        {
                            href: `${siteUrl}stylelint-inspector/`,
                            label: "Stylelint Inspector",
                        },
                        {
                            href: `${siteUrl}eslint-inspector/`,
                            label: "ESLint Inspector",
                        },
                        {
                            href: "https://stylelint.io/developer-guide/plugins/",
                            label: "Stylelint Plugin Guide",
                        },
                    ],
                    title: "Project",
                },
                {
                    items: [
                        {
                            href: `https://github.com/${organizationName}/${projectName}`,
                            label: "GitHub Repository",
                        },
                        {
                            href: `https://github.com/${organizationName}/${projectName}/issues`,
                            label: "Report Issues",
                        },
                        {
                            href: `https://www.npmjs.com/package/${projectName}`,
                            label: "NPM",
                        },
                        {
                            to: "/docs/rules/guides/current-status",
                            label: "📈 Current Status",
                        },
                    ],
                    title: "Support",
                },
            ],
            logo: {
                alt: `${projectName} logo`,
                height: 60,
                href: `https://github.com/${organizationName}/${projectName}`,
                src: "img/logo.svg",
                width: 60,
            },
            style: "dark",
        },
        image: socialCardImagePath,
        metadata: [
            {
                content: projectKeywords,
                name: "keywords",
            },
            {
                content: "summary_large_image",
                name: "twitter:card",
            },
            {
                content: projectName,
                property: "og:site_name",
            },
        ],
        navbar: {
            hideOnScroll: true,
            items: [
                {
                    activeBaseRegex: "^/docs/rules/overview/?$",
                    items: [
                        {
                            label: "Overview",
                            to: "/docs/rules/overview",
                        },
                        {
                            label: "Getting Started",
                            to: "/docs/rules/getting-started",
                        },
                        {
                            label: "Current Status",
                            to: "/docs/rules/guides/current-status",
                        },
                    ],
                    label: "📚 Docs",
                    position: "left",
                    to: "/docs/rules/overview",
                    type: "dropdown",
                },
                {
                    activeBaseRegex: "^/docs/rules(?:/(?!configs(?:/|$)).*)?$",
                    items: [
                        {
                            label: "📚 Rule Reference",
                            to: "/docs/rules",
                        },
                        {
                            label: "🏷️ Named Containers",
                            to: "/docs/rules/category/named-container-contracts",
                        },
                        {
                            label: "📏 Query Ranges",
                            to: "/docs/rules/category/query-range-sanity",
                        },
                        {
                            label: "🪙 Token Discipline",
                            to: "/docs/rules/category/breakpoint-token-discipline",
                        },
                    ],
                    label: "🧭 Rules",
                    position: "left",
                    to: "/docs/rules",
                    type: "dropdown",
                },
                {
                    activeBaseRegex: "^/docs/rules/configs(?:/.*)?$",
                    items: [
                        {
                            label: "🧩 Config Reference",
                            to: "/docs/rules/configs",
                        },
                        {
                            label: "🟡 Recommended",
                            to: "/docs/rules/configs/container-query-recommended",
                        },
                        {
                            label: "🔴 Strict",
                            to: "/docs/rules/configs/container-query-strict",
                        },
                        {
                            label: "🟣 All",
                            to: "/docs/rules/configs/container-query-all",
                        },
                    ],
                    label: "🧰 Configs",
                    position: "left",
                    to: "/docs/rules/configs",
                    type: "dropdown",
                },
                {
                    items: [
                        {
                            label: "🛠️ Developer Guide",
                            to: "/docs/developer",
                        },
                        {
                            label: "📘 API Reference",
                            to: "/docs/developer/api",
                        },
                        {
                            label: "⚙️ Internal API",
                            to: "/docs/category/runtime",
                        },
                        {
                            label: "📜 Docs Site Contract",
                            to: "/docs/developer/docusaurus-site-contract",
                        },
                    ],
                    label: "🛠️ Developer",
                    position: "right",
                    to: "/docs/developer",
                    type: "dropdown",
                },
                {
                    href: `https://github.com/${organizationName}/${projectName}`,
                    label: "GitHub",
                    position: "right",
                },
            ],
            logo: {
                alt: `${projectName} logo`,
                height: 42,
                href: baseUrl,
                src: "img/logo.svg",
                width: 42,
            },
            style: "dark",
            title: "CQ Sanity",
        },
        prism: {
            additionalLanguages: [
                "bash",
                "css",
                "json",
                "typescript",
                "yaml",
            ],
            darkTheme: prismThemes.dracula,
            defaultLanguage: "css",
            theme: prismThemes.github,
        },
        tableOfContents: {
            maxHeadingLevel: 4,
            minHeadingLevel: 2,
        },
        zoom: {
            background: {
                dark: "rgb(28, 25, 23)",
                light: "rgb(255, 251, 235)",
            },
            selector: ".markdown > img",
        },
    } satisfies Preset.ThemeConfig,
    themes: [
        "@docusaurus/theme-mermaid",
        [
            "@easyops-cn/docusaurus-search-local",
            {
                blogDir: "blog",
                blogRouteBasePath: "blog",
                docsDir: "docs",
                docsRouteBasePath: "docs",
                explicitSearchResultPath: false,
                forceIgnoreNoIndex: true,
                fuzzyMatchingDistance: 1,
                hashed: true,
                hideSearchBarWithNoSearchContext: false,
                highlightSearchTermsOnTargetPage: true,
                indexBlog: true,
                indexDocs: true,
                indexPages: false,
                language: ["en"],
                removeDefaultStemmer: true,
                removeDefaultStopWordFilter: false,
                searchBarPosition: "left",
                searchBarShortcut: true,
                searchBarShortcutHint: true,
                searchBarShortcutKeymap: "ctrl+k",
                searchResultContextMaxLength: 96,
                searchResultLimits: 8,
                useAllContextsWithNoSearchContext: false,
            },
        ],
    ],
    title: projectName,
    titleDelimiter: "|",
    trailingSlash: true,
    url: siteOrigin,
} satisfies Config;

export default config;
