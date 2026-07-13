/**
 * @packageDocumentation
 * Rule requiring modern range syntax for container size feature queries.
 */
import type { Root } from "postcss";

import stylelint, { type PostcssResult } from "stylelint";
import { arrayIncludes, isDefined } from "ts-extras";

import {
    extractParenthesizedExpressions,
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

const ruleName = createRuleName("prefer-range-syntax");

const rangeSyntaxPreferredMessage = (
    legacyExpression: string,
    suggestedExpression: string
): string =>
    `Use modern range comparison syntax instead of "${legacyExpression}". Replace with "${suggestedExpression}".`;

const messages = stylelint.utils.ruleMessages(ruleName, {
    rangeSyntaxPreferred: rangeSyntaxPreferredMessage,
});

const docs = {
    description:
        "Disallow legacy min-/max- container size syntax and require modern range comparison syntax.",
    recommended: false,
    url: createRuleDocsUrl("prefer-range-syntax"),
} as const;

type LegacyRangeDirection = "max" | "min";
type LegacyRangeFeature =
    | "block-size"
    | "inline-size"
    | "width";
type ParsedLegacyRangeExpression = Readonly<{
    direction: LegacyRangeDirection;
    feature: LegacyRangeFeature;
    value: string;
}>;

const isLegacyRangeDirection = (value: string): value is LegacyRangeDirection =>
    value === "max" || value === "min";

const isLegacyRangeFeature = (value: string): value is LegacyRangeFeature =>
    arrayIncludes(
        [
            "block-size",
            "inline-size",
            "width",
        ],
        value
    );

const parseLegacyRangeExpression = (
    expression: string
): ParsedLegacyRangeExpression | undefined => {
    const trimmedExpression = expression.trim();
    const separatorOffset = trimmedExpression.indexOf(":");

    if (separatorOffset <= 0) {
        return undefined;
    }

    const leftSide = trimmedExpression
        .slice(0, separatorOffset)
        .trim()
        .toLowerCase();
    const value = trimmedExpression.slice(separatorOffset + 1).trim();

    if (value === "") {
        return undefined;
    }

    const featureSeparatorOffset = leftSide.indexOf("-");

    if (featureSeparatorOffset <= 0) {
        return undefined;
    }

    const direction = leftSide.slice(0, featureSeparatorOffset);
    const feature = leftSide.slice(featureSeparatorOffset + 1);

    if (!isLegacyRangeDirection(direction) || !isLegacyRangeFeature(feature)) {
        return undefined;
    }

    return {
        direction,
        feature,
        value,
    };
};

const rule =
    (primary: boolean) =>
    (root: Readonly<Root>, result: Readonly<PostcssResult>) => {
        const validOptions = validateOptions(result, ruleName, {
            actual: primary,
            possible: [true],
        });

        if (!validOptions) {
            return;
        }

        root.walkAtRules("container", (atRule) => {
            const { condition } = parseContainerQueryParams(atRule.params);

            if (condition === "") {
                return;
            }

            for (const expression of extractParenthesizedExpressions(
                condition
            )) {
                const parsedLegacyExpression =
                    parseLegacyRangeExpression(expression);

                if (isDefined(parsedLegacyExpression)) {
                    const comparisonOperator =
                        parsedLegacyExpression.direction === "min"
                            ? ">="
                            : "<=";
                    const suggestedExpression = `${parsedLegacyExpression.feature} ${comparisonOperator} ${parsedLegacyExpression.value}`;

                    report({
                        message: messages.rangeSyntaxPreferred(
                            expression,
                            suggestedExpression
                        ),
                        node: atRule,
                        result,
                        ruleName,
                    });
                }
            }
        });
    };

/** Require modern range-comparison syntax in `@container` size queries. */
const preferRangeSyntaxRule: StylelintPluginRuleContract = createStylelintRule({
    docs,
    messages,
    meta: {
        url: docs.url,
    },
    rule,
    ruleName,
});

export default preferRangeSyntaxRule;
