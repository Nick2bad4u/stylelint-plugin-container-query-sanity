/**
 * @packageDocumentation
 * Rule validating contradictory or mixed-unit container query intervals.
 */
import type { AtRule, Root } from "postcss";

import stylelint, { type PostcssResult } from "stylelint";
import { arrayJoin, isDefined, isEmpty } from "ts-extras";

import {
    collectFeatureConstraints,
    groupConstraintsByFeatureAndUnit,
    isIntervalEmpty,
    normalizeInterval,
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

const ruleName = createRuleName("no-invalid-container-query-ranges");

const mixedUnitsMessage = (feature: string, units: string): string =>
    `Container query range for "${feature}" mixes units (${units}). Use one unit family per range expression.`;
const unreachableRangeMessage = (
    feature: string,
    lower: string,
    upper: string
): string =>
    `Container query range for "${feature}" is empty (${lower} to ${upper}).`;

const messages = stylelint.utils.ruleMessages(ruleName, {
    mixedUnits: mixedUnitsMessage,
    unreachableRange: unreachableRangeMessage,
});

const docs = {
    description:
        "Disallow contradictory or mixed-unit ranges in container size queries.",
    recommended: true,
    url: createRuleDocsUrl("no-invalid-container-query-ranges"),
} as const;

const formatBound = (
    bound: Readonly<{
        inclusive: boolean;
        unit: string;
        value: number;
    }>
): string =>
    `${bound.inclusive ? "[" : "("}${String(bound.value)}${bound.unit}`;

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
            const constraints = collectFeatureConstraints(condition);

            if (isEmpty(constraints)) {
                return;
            }

            const grouped = groupConstraintsByFeatureAndUnit(constraints);

            for (const [feature, byUnit] of grouped) {
                const unitEntries = [...byUnit];
                const sortedUnitEntries = unitEntries.toSorted(
                    ([leftUnit], [rightUnit]) =>
                        leftUnit.localeCompare(rightUnit)
                );
                const unitKeys = sortedUnitEntries.map(([unit]) => unit);

                if (unitKeys.length > 1) {
                    report({
                        message: messages.mixedUnits(
                            feature,
                            arrayJoin(unitKeys, ", ")
                        ),
                        node: atRule,
                        result,
                        ruleName,
                    });
                }

                for (const [, sameUnitConstraints] of sortedUnitEntries) {
                    reportEmptyInterval({
                        atRule,
                        constraints: sameUnitConstraints,
                        feature,
                        result,
                    });
                }
            }
        });
    };

function reportEmptyInterval({
    atRule,
    constraints,
    feature,
    result,
}: Readonly<{
    atRule: AtRule;
    constraints: Parameters<typeof normalizeInterval>[0];
    feature: string;
    result: Readonly<PostcssResult>;
}>): void {
    const interval = normalizeInterval(constraints);
    const { lower, upper } = interval;

    if (!isIntervalEmpty(interval) || !isDefined(lower) || !isDefined(upper)) {
        return;
    }

    report({
        message: messages.unreachableRange(
            feature,
            formatBound(lower),
            `${formatBound(upper)}]`
        ),
        node: atRule,
        result,
        ruleName,
    });
}

/** Disallow contradictory and mixed-unit intervals in container queries. */
const noInvalidContainerQueryRangesRule: StylelintPluginRuleContract =
    createStylelintRule({
        docs,
        messages,
        meta: {
            url: docs.url,
        },
        rule,
        ruleName,
    });

export default noInvalidContainerQueryRangesRule;
