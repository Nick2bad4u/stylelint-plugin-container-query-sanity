/**
 * @packageDocumentation
 * Rule validating that named container queries reference declared container names.
 */
import type { Root } from "postcss";

import stylelint, { type PostcssResult } from "stylelint";
import { arrayJoin, isDefined, isEmpty, setHas } from "ts-extras";

import {
    isValidContainerName,
    parseContainerQueryParams,
} from "../_internal/container-query-analysis.js";
import {
    createStylelintRule,
    type StylelintPluginRuleContract,
} from "../_internal/create-stylelint-rule.js";
import {
    createRuleDocsUrl,
    createRuleName,
} from "../_internal/plugin-constants.js";

const { report, validateOptions } = stylelint.utils;

const ruleName = createRuleName("no-unknown-container-names");

type NoUnknownContainerNamesSecondaryOptions = Readonly<{
    ignoreNames?: readonly string[];
    whenNoDeclarations?: "ignore" | "report";
}>;

const cssWideKeywords = new Set([
    "inherit",
    "initial",
    "revert",
    "revert-layer",
    "unset",
]);
const containerTypeKeywords = new Set([
    "anchored",
    "inline-size",
    "normal",
    "scroll-state",
    "size",
]);
const whitespaceCharacterPattern = /^[\t\n\r ]$/v;

const undeclaredContainerNameMessage = (
    containerName: string,
    declaredNames: string
): string => {
    const guidance =
        declaredNames === ""
            ? "Declare a matching name with container-name/container."
            : `Known container names in this stylesheet: ${declaredNames}.`;

    return `Container query targets "${containerName}" but no matching container name is declared in this stylesheet. ${guidance}`;
};

const messages = stylelint.utils.ruleMessages(ruleName, {
    undeclaredContainerName: undeclaredContainerNameMessage,
});

const docs = {
    description:
        "Disallow @container names that are never declared via container-name/container in the same stylesheet.",
    recommended: false,
    url: createRuleDocsUrl("no-unknown-container-names"),
} as const;

const rule =
    (
        primary: boolean,
        secondaryOptions: NoUnknownContainerNamesSecondaryOptions = {}
    ) =>
    (root: Readonly<Root>, result: Readonly<PostcssResult>) => {
        const isValidOptions = validateOptions(
            result,
            ruleName,
            {
                actual: primary,
                possible: [true],
            },
            {
                actual: secondaryOptions.ignoreNames,
                optional: true,
                possible: [
                    (value: unknown) =>
                        Array.isArray(value) &&
                        value.every(
                            (item) =>
                                typeof item === "string" &&
                                item.trim().length > 0
                        ),
                ],
            },
            {
                actual: secondaryOptions.whenNoDeclarations,
                optional: true,
                possible: ["ignore", "report"],
            }
        );

        if (!isValidOptions) {
            return;
        }

        const declaredNames = collectDeclaredContainerNames(root);
        const declaredNamesList = [...declaredNames];
        declaredNamesList.sort((left, right) => left.localeCompare(right));
        const declaredNamesLookup = new Set<string>(declaredNamesList);
        const ignoredNames = new Set(
            (secondaryOptions.ignoreNames ?? []).map((name) => name.trim())
        );
        const whenNoDeclarations =
            secondaryOptions.whenNoDeclarations ?? "ignore";

        if (whenNoDeclarations === "ignore" && isEmpty(declaredNamesList)) {
            return;
        }

        root.walkAtRules("container", (atRule) => {
            const { containerName } = parseContainerQueryParams(atRule.params);

            if (!isDefined(containerName)) {
                return;
            }

            if (setHas(ignoredNames, containerName)) {
                return;
            }

            // eslint-disable-next-line typefest/prefer-ts-extras-set-has -- `setHas` cannot infer non-literal `Set<string>` here without collapsing to `never`.
            if (declaredNamesLookup.has(containerName)) {
                return;
            }

            report({
                message: undeclaredContainerNameMessage(
                    containerName,
                    arrayJoin(declaredNamesList, ", ")
                ),
                node: atRule,
                result,
                ruleName,
            });
        });
    };

function collectDeclaredContainerNames(root: Readonly<Root>): Set<string> {
    const names = new Set<string>();

    root.walkDecls((declaration) => {
        const property = declaration.prop.trim().toLowerCase();

        if (property === "container-name") {
            for (const name of extractNamesFromContainerNameValue(
                declaration.value
            )) {
                names.add(name);
            }
            return;
        }

        if (property !== "container") {
            return;
        }

        for (const name of extractNamesFromContainerShorthandValue(
            declaration.value
        )) {
            names.add(name);
        }
    });

    return names;
}

function extractNamesFromContainerNameValue(value: string): readonly string[] {
    const trimmedValue = value.trim();
    const lowercaseValue = trimmedValue.toLowerCase();

    if (
        trimmedValue === "" ||
        setHas(cssWideKeywords, lowercaseValue) ||
        hasDynamicFunction(trimmedValue)
    ) {
        return [];
    }

    const names: string[] = [];

    for (const token of splitWhitespaceTokens(trimmedValue)) {
        const lowercaseToken = token.toLowerCase();

        if (lowercaseToken !== "none" && isValidContainerName(token)) {
            names.push(token);
        }
    }

    return names;
}

function extractNamesFromContainerShorthandValue(
    value: string
): readonly string[] {
    const trimmedValue = value.trim();

    if (trimmedValue === "" || hasDynamicFunction(trimmedValue)) {
        return [];
    }

    const slashIndex = trimmedValue.indexOf("/");
    const nameSection =
        slashIndex === -1
            ? trimmedValue
            : trimmedValue.slice(0, slashIndex).trim();

    if (nameSection === "") {
        return [];
    }

    const lowercaseNameSection = nameSection.toLowerCase();

    if (
        lowercaseNameSection === "none" ||
        setHas(cssWideKeywords, lowercaseNameSection)
    ) {
        return [];
    }

    const tokens = splitWhitespaceTokens(nameSection);

    if (isEmpty(tokens)) {
        return [];
    }

    if (
        slashIndex === -1 &&
        tokens.every((token) =>
            setHas(containerTypeKeywords, token.toLowerCase())
        )
    ) {
        return [];
    }

    const names: string[] = [];

    for (const token of tokens) {
        const lowercaseToken = token.toLowerCase();

        if (lowercaseToken !== "none" && isValidContainerName(token)) {
            names.push(token);
        }
    }

    return names;
}

function hasDynamicFunction(value: string): boolean {
    const normalized = value.toLowerCase();

    return normalized.includes("env(") || normalized.includes("var(");
}

function splitWhitespaceTokens(value: string): readonly string[] {
    const tokens: string[] = [];
    let currentToken = "";

    for (const character of value) {
        const isWhitespaceCharacter =
            whitespaceCharacterPattern.test(character);

        if (isWhitespaceCharacter) {
            if (currentToken !== "") {
                tokens.push(currentToken);
                currentToken = "";
            }
        } else {
            currentToken += character;
        }
    }

    if (currentToken !== "") {
        tokens.push(currentToken);
    }

    return tokens;
}

/** Validate `@container` names against names declared in the same stylesheet. */
const noUnknownContainerNamesRule: StylelintPluginRuleContract =
    createStylelintRule({
        docs,
        messages,
        meta: {
            url: docs.url,
        },
        rule,
        ruleName,
    });

export default noUnknownContainerNamesRule;
