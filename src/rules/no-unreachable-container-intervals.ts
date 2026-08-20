/**
 * @packageDocumentation
 * Rule detecting unreachable nested container intervals.
 */
import type { AtRule, Root } from "postcss";

import stylelint, { type PostcssResult } from "stylelint";
import { isDefined, isEmpty } from "ts-extras";

import {
    collectFeatureConstraints,
    type FeatureConstraint,
    type FeatureInterval,
    groupConstraintsByFeatureAndUnit,
    type IntervalBound,
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

const ruleName = createRuleName("no-unreachable-container-intervals");

const shadowedRangeMessage = (feature: string, unit: string): string =>
    `Nested @container range for "${feature}" (${unit}) can never match because outer and inner intervals do not overlap.`;

const messages = stylelint.utils.ruleMessages(ruleName, {
    shadowedRange: shadowedRangeMessage,
});

const docs = {
    description:
        "Disallow nested @container conditions whose intervals cannot overlap with parent container ranges.",
    recommended: true,
    url: createRuleDocsUrl("no-unreachable-container-intervals"),
} as const;

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
            const parsedCurrent = parseContainerQueryParams(atRule.params);
            const currentConstraints = collectFeatureConstraints(
                parsedCurrent.condition
            );

            if (isEmpty(currentConstraints)) {
                return;
            }

            const parentAtRule = atRule.parent;

            if (
                parentAtRule?.type !== "atrule" ||
                parentAtRule.name !== "container"
            ) {
                return;
            }

            const parsedParent = parseContainerQueryParams(parentAtRule.params);
            const parentContainerName = parsedParent.containerName;
            const currentContainerName = parsedCurrent.containerName;

            if (
                parentContainerName !== currentContainerName &&
                isDefined(parentContainerName) &&
                isDefined(currentContainerName)
            ) {
                return;
            }

            const parentConstraints = collectFeatureConstraints(
                parsedParent.condition
            );

            if (isEmpty(parentConstraints)) {
                return;
            }

            const currentByFeature =
                groupConstraintsByFeatureAndUnit(currentConstraints);
            const parentByFeature =
                groupConstraintsByFeatureAndUnit(parentConstraints);

            for (const [feature, currentByUnit] of currentByFeature) {
                const parentByUnit = parentByFeature.get(feature);

                if (!isDefined(parentByUnit)) {
                    continue;
                }

                for (const [unit, currentUnitConstraints] of currentByUnit) {
                    const parentUnitConstraints = parentByUnit.get(unit);

                    if (!isDefined(parentUnitConstraints)) {
                        continue;
                    }

                    reportIfDisjoint({
                        atRule,
                        currentUnitConstraints,
                        feature,
                        parentUnitConstraints,
                        result,
                        ruleName,
                        unit,
                    });
                }
            }
        });
    };

type ComparableBound = Readonly<{
    inclusive: boolean;
    value: number;
}>;

function intervalsAreDisjoint(
    first: FeatureInterval,
    second: FeatureInterval
): boolean {
    const firstLower = toComparable(first.lower);
    const firstUpper = toComparable(first.upper);
    const secondLower = toComparable(second.lower);
    const secondUpper = toComparable(second.upper);

    return (
        rightSideEndsBeforeLeftStarts(secondLower, firstUpper) ||
        rightSideEndsBeforeLeftStarts(firstLower, secondUpper)
    );
}

function reportIfDisjoint(
    input: Readonly<{
        atRule: AtRule;
        currentUnitConstraints: readonly FeatureConstraint[];
        feature: string;
        parentUnitConstraints: readonly FeatureConstraint[];
        result: Readonly<PostcssResult>;
        ruleName: string;
        unit: string;
    }>
): void {
    const currentInterval = normalizeInterval(input.currentUnitConstraints);
    const parentInterval = normalizeInterval(input.parentUnitConstraints);

    if (intervalsAreDisjoint(parentInterval, currentInterval)) {
        report({
            message: messages.shadowedRange(input.feature, input.unit),
            node: input.atRule,
            result: input.result,
            ruleName: input.ruleName,
        });
    }
}

function rightSideEndsBeforeLeftStarts(
    leftStart: ComparableBound | undefined,
    rightEnd: ComparableBound | undefined
): boolean {
    if (!isDefined(leftStart) || !isDefined(rightEnd)) {
        return false;
    }

    if (rightEnd.value < leftStart.value) {
        return true;
    }

    return (
        rightEnd.value === leftStart.value &&
        (!rightEnd.inclusive || !leftStart.inclusive)
    );
}

function toComparable(
    bound: IntervalBound | undefined
): ComparableBound | undefined {
    if (!isDefined(bound)) {
        return undefined;
    }

    return {
        inclusive: bound.inclusive,
        value: bound.value,
    };
}

/** Disallow nested container intervals that can never overlap. */
const noUnreachableContainerIntervalsRule: StylelintPluginRuleContract =
    createStylelintRule({
        docs,
        messages,
        meta: {
            url: docs.url,
        },
        rule,
        ruleName,
    });

export default noUnreachableContainerIntervalsRule;
