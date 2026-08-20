/**
 * @packageDocumentation
 * Rule detecting one container name declared with incompatible type contracts.
 */
import type { Root } from "postcss";

import stylelint, { type PostcssResult } from "stylelint";
import { arrayJoin, isDefined, setHas } from "ts-extras";

import { collectContainerTypesByName } from "../_internal/container-declaration-analysis.js";
import {
    createStylelintRule,
    type StylelintPluginRuleContract,
} from "../_internal/create-stylelint-rule.js";
import {
    createRuleDocsUrl,
    createRuleName,
} from "../_internal/plugin-constants.js";

const { report, validateOptions } = stylelint.utils;

const ruleName = createRuleName("no-conflicting-container-name-declarations");

type NoConflictingContainerNameDeclarationsSecondaryOptions = Readonly<{
    ignoreNames?: readonly string[];
}>;

const conflictingDeclarationMessage = (
    containerName: string,
    declarations: string
): string =>
    `Container name "${containerName}" is declared with conflicting container-type values (${declarations}). Keep each container name tied to one stable type contract.`;

const messages = stylelint.utils.ruleMessages(ruleName, {
    conflictingDeclaration: conflictingDeclarationMessage,
});

const docs = {
    description:
        "Disallow reusing the same container name with conflicting static container-type declarations.",
    recommended: false,
    url: createRuleDocsUrl("no-conflicting-container-name-declarations"),
} as const;

const rule =
    (
        primary: boolean,
        secondaryOptions: NoConflictingContainerNameDeclarationsSecondaryOptions = {}
    ) =>
    (root: Readonly<Root>, result: Readonly<PostcssResult>) => {
        const validOptions = validateOptions(result, ruleName, {
            actual: primary,
            possible: [true],
        });

        if (!validOptions) {
            return;
        }

        const ignoredNames = new Set(
            (secondaryOptions.ignoreNames ?? []).map((name) => name.trim())
        );
        const summaryByName = collectContainerTypesByName(root);

        for (const [containerName, summary] of summaryByName) {
            if (setHas(ignoredNames, containerName)) {
                continue;
            }

            const staticDeclarations = sortLexicographically([
                ...new Set(
                    summary.declarations.filter(
                        (declaration) => declaration.trim() !== ""
                    )
                ),
            ]);

            if (
                staticDeclarations.length > 1 &&
                isDefined(summary.anchorNode)
            ) {
                report({
                    message: messages.conflictingDeclaration(
                        containerName,
                        arrayJoin(staticDeclarations, ", ")
                    ),
                    node: summary.anchorNode,
                    result,
                    ruleName,
                });
            }
        }
    };

function sortLexicographically(values: readonly string[]): readonly string[] {
    const sorted: string[] = [];

    for (const value of values) {
        const earlierValueIndex = sorted.findIndex(
            (sortedValue) => value.localeCompare(sortedValue) < 0
        );
        const insertionIndex =
            earlierValueIndex === -1 ? sorted.length : earlierValueIndex;

        sorted.splice(insertionIndex, 0, value);
    }

    return sorted;
}

/** Detect conflicting static container-type declarations for one name. */
const noConflictingContainerNameDeclarationsRule: StylelintPluginRuleContract =
    createStylelintRule({
        docs,
        messages,
        meta: {
            url: docs.url,
        },
        rule,
        ruleName,
    });

export default noConflictingContainerNameDeclarationsRule;
