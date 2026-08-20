/**
 * @packageDocumentation
 * Lightweight parsing helpers for container-query rule analysis.
 */
import { isDefined, isFinite as isNumberFinite, setHas } from "ts-extras";

/** Size-related container query feature names recognized by this plugin. */
export type ContainerQueryFeatureName =
    | "aspect-ratio"
    | "block-size"
    | "height"
    | "inline-size"
    | "orientation"
    | "width";

/** Supported container range features handled by this plugin. */
export type ContainerSizeFeature =
    | "block-size"
    | "inline-size"
    | "width";

/** One parsed range constraint extracted from a query condition. */
export type FeatureConstraint = Readonly<{
    feature: ContainerSizeFeature;
    interval: FeatureInterval;
}>;

/** Lower/upper interval bounds for a parsed feature constraint. */
export type FeatureInterval = Readonly<{
    lower?: IntervalBound;
    upper?: IntervalBound;
}>;

/** One numeric interval bound with its unit and inclusivity. */
export type IntervalBound = Readonly<{
    inclusive: boolean;
    unit: string;
    value: number;
}>;

/** Parsed `@container` params split into optional name and condition. */
export type ParsedContainerQuery = Readonly<{
    condition: string;
    containerName?: string;
}>;

/** Supported relational operators in range syntax. */
export type RangeOperator =
    | "<"
    | "<="
    | ">"
    | ">=";

type ParsedDimension = Readonly<{
    unit: string;
    value: number;
}>;

const reservedContainerNames = new Set([
    "and",
    "default",
    "not",
    "or",
]);
const sizeFeatures = new Set<ContainerSizeFeature>([
    "block-size",
    "inline-size",
    "width",
]);
const sizeQueryFeatureNames = new Set<ContainerQueryFeatureName>([
    "aspect-ratio",
    "block-size",
    "height",
    "inline-size",
    "orientation",
    "width",
]);
const whitespaceCharacterPattern = /^[\t\n\r ]$/v;

/** Collect feature constraints from one container-query condition. */
export function collectFeatureConstraints(
    condition: string
): readonly FeatureConstraint[] {
    const constraints: FeatureConstraint[] = [];

    for (const expression of extractParenthesizedExpressions(condition)) {
        const nextConstraints = parseExpressionConstraints(expression);

        for (const nextConstraint of nextConstraints) {
            constraints.push(nextConstraint);
        }
    }

    return constraints;
}

/** Collect size-related feature names from one container-query condition. */
export function collectSizeQueryFeatureNames(
    condition: string
): readonly ContainerQueryFeatureName[] {
    const featureNames = new Set<ContainerQueryFeatureName>();

    for (const expression of extractParenthesizedExpressions(condition)) {
        const legacyFeature = parseLegacyFeatureName(expression);

        if (isDefined(legacyFeature)) {
            featureNames.add(legacyFeature);
        }

        for (const token of tokenizeExpression(expression)) {
            const feature = parseSizeQueryFeatureName(token);

            if (isDefined(feature)) {
                featureNames.add(feature);
            }
        }
    }

    return sortLexicographically([...featureNames]);
}

/** Collect all literal length values from one container-query condition. */
export function extractLengthLiterals(condition: string): readonly string[] {
    const literals: string[] = [];
    let index = 0;

    while (index < condition.length) {
        const parsedLiteral = parseDimensionAt(condition, index);

        if (isDefined(parsedLiteral)) {
            literals.push(parsedLiteral.literal);
            index = parsedLiteral.nextIndex;
        } else {
            index += 1;
        }
    }

    return literals;
}

/** Extract top-level parenthesized expressions from a query condition. */
export function extractParenthesizedExpressions(
    condition: string
): readonly string[] {
    const expressions: string[] = [];
    const appendExpression = (candidate: string): void => {
        const expression = candidate.trim();

        if (expression !== "") {
            expressions.push(expression);
        }
    };
    let depth = 0;
    let expressionStart = -1;

    for (let index = 0; index < condition.length; index += 1) {
        const character = condition[index];

        if (character === "(") {
            if (depth === 0) {
                expressionStart = index + 1;
            }

            depth += 1;
            continue;
        }

        if (character === ")" && depth > 0) {
            depth -= 1;

            if (depth === 0 && expressionStart >= 0) {
                appendExpression(condition.slice(expressionStart, index));
                expressionStart = -1;
            }
        }
    }

    return expressions;
}

/** Group constraints by feature then by unit. */
export function groupConstraintsByFeatureAndUnit(
    constraints: readonly FeatureConstraint[]
): ReadonlyMap<ContainerSizeFeature, ReadonlyMap<string, FeatureConstraint[]>> {
    const grouped = new Map<
        ContainerSizeFeature,
        Map<string, FeatureConstraint[]>
    >();

    for (const constraint of constraints) {
        const byUnit =
            grouped.get(constraint.feature) ??
            new Map<string, FeatureConstraint[]>();

        if (!grouped.has(constraint.feature)) {
            grouped.set(constraint.feature, byUnit);
        }

        const units = new Set<string>();

        if (isDefined(constraint.interval.lower)) {
            units.add(constraint.interval.lower.unit);
        }

        if (isDefined(constraint.interval.upper)) {
            units.add(constraint.interval.upper.unit);
        }

        for (const unit of units) {
            const unitConstraints: FeatureConstraint[] = byUnit.get(unit) ?? [];

            if (!byUnit.has(unit)) {
                byUnit.set(unit, unitConstraints);
            }

            unitConstraints.push(constraint);
        }
    }

    return grouped;
}

/** Return whether the condition contains a function-style query. */
export function hasQueryFunctionCondition(
    condition: string,
    functionName: "scroll-state" | "style"
): boolean {
    const normalizedFunctionName = functionName.toLowerCase();
    const normalizedCondition = condition.toLowerCase();

    for (let index = 0; index < normalizedCondition.length; index += 1) {
        const nextIndex = index + normalizedFunctionName.length;
        const isFunctionNameMatch =
            normalizedCondition.slice(index, nextIndex) ===
            normalizedFunctionName;

        if (isFunctionNameMatch) {
            const previousCharacter = normalizedCondition[index - 1];
            const nextCharacter = normalizedCondition[nextIndex];

            if (
                nextCharacter === "(" &&
                !isIdentifierCharacterOrHyphen(previousCharacter)
            ) {
                return true;
            }
        }
    }

    return false;
}

/** Return true when an interval cannot match any value. */
export function isIntervalEmpty(interval: FeatureInterval): boolean {
    const { lower, upper } = interval;

    if (!isDefined(lower) || !isDefined(upper)) {
        return false;
    }

    if (lower.unit !== upper.unit) {
        return false;
    }

    if (lower.value > upper.value) {
        return true;
    }

    if (lower.value < upper.value) {
        return false;
    }

    return !lower.inclusive || !upper.inclusive;
}

/** Check whether a parsed container name is syntactically valid. */
export function isValidContainerName(containerName: string): boolean {
    if (
        containerName === "" ||
        setHas(reservedContainerNames, containerName.toLowerCase())
    ) {
        return false;
    }

    if (!isValidIdentifierStart(containerName)) {
        return false;
    }

    for (const character of containerName) {
        if (!isIdentifierCharacter(character)) {
            return false;
        }
    }

    return true;
}

/** Collapse a constraint list into one normalized interval. */
export function normalizeInterval(
    constraints: readonly FeatureConstraint[]
): FeatureInterval {
    const bounds: {
        lower?: IntervalBound;
        upper?: IntervalBound;
    } = {};

    for (const constraint of constraints) {
        if (isDefined(constraint.interval.lower)) {
            bounds.lower = pickStricterLowerBound(
                bounds.lower,
                constraint.interval.lower
            );
        }

        if (isDefined(constraint.interval.upper)) {
            bounds.upper = pickStricterUpperBound(
                bounds.upper,
                constraint.interval.upper
            );
        }
    }

    const mergedBounds: {
        lower?: IntervalBound;
        upper?: IntervalBound;
    } = {};

    if (isDefined(bounds.lower)) {
        mergedBounds.lower = bounds.lower;
    }

    if (isDefined(bounds.upper)) {
        mergedBounds.upper = bounds.upper;
    }

    return mergedBounds;
}

/**
 * Parse optional container-name and condition from one `@container` params
 * value.
 */
export function parseContainerQueryParams(
    params: string
): ParsedContainerQuery {
    const trimmedParams = params.trim();
    const firstParenOffset = trimmedParams.indexOf("(");

    if (firstParenOffset === -1) {
        return trimmedParams === ""
            ? { condition: "" }
            : { condition: "", containerName: trimmedParams };
    }

    const prefix = trimmedParams.slice(0, firstParenOffset).trim();
    const functionalConditionName = getFunctionalConditionName(prefix);

    if (isDefined(functionalConditionName)) {
        const conditionStartOffset =
            prefix.length - functionalConditionName.length;
        const containerName = prefix.slice(0, conditionStartOffset).trim();

        const condition = trimmedParams.slice(conditionStartOffset).trim();

        return containerName === ""
            ? { condition }
            : { condition, containerName };
    }

    const nameCandidate = prefix;

    const condition = trimmedParams.slice(firstParenOffset).trim();

    return nameCandidate === ""
        ? { condition }
        : { condition, containerName: nameCandidate };
}

function createFeatureComparisonConstraint(
    feature: ContainerSizeFeature,
    operator: RangeOperator,
    dimension: ParsedDimension
): FeatureConstraint {
    if (operator === ">" || operator === ">=") {
        return {
            feature,
            interval: {
                lower: {
                    inclusive: operator === ">=",
                    unit: dimension.unit,
                    value: dimension.value,
                },
            },
        };
    }

    return {
        feature,
        interval: {
            upper: {
                inclusive: operator === "<=",
                unit: dimension.unit,
                value: dimension.value,
            },
        },
    };
}

function createReverseComparisonConstraint(
    dimension: ParsedDimension,
    operator: RangeOperator,
    feature: ContainerSizeFeature
): FeatureConstraint {
    if (operator === "<" || operator === "<=") {
        return {
            feature,
            interval: {
                lower: {
                    inclusive: operator === "<=",
                    unit: dimension.unit,
                    value: dimension.value,
                },
            },
        };
    }

    return {
        feature,
        interval: {
            upper: {
                inclusive: operator === ">=",
                unit: dimension.unit,
                value: dimension.value,
            },
        },
    };
}

function firstToken(value: string): string {
    let token = "";

    for (const character of value.trim()) {
        if (isWhitespace(character)) {
            return token;
        }

        token += character;
    }

    return token;
}

function getFunctionalConditionName(prefix: string): string | undefined {
    const normalizedPrefix = prefix.toLowerCase();

    if (normalizedPrefix.endsWith("scroll-state")) {
        return prefix.slice(prefix.length - "scroll-state".length);
    }

    if (normalizedPrefix.endsWith("style")) {
        return prefix.slice(prefix.length - "style".length);
    }

    return undefined;
}

function isDigit(character: string | undefined): boolean {
    return isDefined(character) && character >= "0" && character <= "9";
}

function isIdentifierCharacter(character: string): boolean {
    return (
        character === "_" ||
        character === "-" ||
        (character >= "a" && character <= "z") ||
        (character >= "A" && character <= "Z") ||
        (character >= "0" && character <= "9")
    );
}

function isIdentifierCharacterOrHyphen(character: string | undefined): boolean {
    return isDefined(character) && isIdentifierCharacter(character);
}

function isIdentifierInitialCharacter(character: string | undefined): boolean {
    if (!isDefined(character)) {
        return false;
    }

    return (
        character === "_" ||
        (character >= "a" && character <= "z") ||
        (character >= "A" && character <= "Z")
    );
}

function isUnitCharacter(character: string | undefined): boolean {
    if (!isDefined(character)) {
        return false;
    }

    return (
        character === "%" ||
        (character >= "a" && character <= "z") ||
        (character >= "A" && character <= "Z")
    );
}

function isValidIdentifierStart(containerName: string): boolean {
    const firstCharacter = containerName.at(0);

    if (firstCharacter === "-") {
        const secondCharacter = containerName.at(1);

        return (
            secondCharacter === "-" ||
            isIdentifierInitialCharacter(secondCharacter)
        );
    }

    return isIdentifierInitialCharacter(firstCharacter);
}

function isWhitespace(character: string): boolean {
    return whitespaceCharacterPattern.test(character);
}

function parseAscendingBoundedConstraint(
    input: Readonly<{
        featureMiddle: ContainerSizeFeature | undefined;
        firstOperator: RangeOperator;
        leftDimension: ParsedDimension | undefined;
        rightDimension: ParsedDimension | undefined;
        secondOperator: RangeOperator;
    }>
): FeatureConstraint | undefined {
    if (
        !isDefined(input.featureMiddle) ||
        !isDefined(input.leftDimension) ||
        !isDefined(input.rightDimension)
    ) {
        return undefined;
    }

    if (
        (input.firstOperator !== "<" && input.firstOperator !== "<=") ||
        (input.secondOperator !== "<" && input.secondOperator !== "<=")
    ) {
        return undefined;
    }

    return {
        feature: input.featureMiddle,
        interval: {
            lower: {
                inclusive: input.firstOperator === "<=",
                unit: input.leftDimension.unit,
                value: input.leftDimension.value,
            },
            upper: {
                inclusive: input.secondOperator === "<=",
                unit: input.rightDimension.unit,
                value: input.rightDimension.value,
            },
        },
    };
}

function parseBoundedComparison(
    tokens: readonly string[]
): FeatureConstraint | undefined {
    const [
        firstTokenValue = "",
        firstOperatorToken = "",
        middleToken = "",
        secondOperatorToken = "",
        lastToken = "",
    ] = tokens;
    const firstOperator = parseOperator(firstOperatorToken);
    const secondOperator = parseOperator(secondOperatorToken);

    if (!isDefined(firstOperator) || !isDefined(secondOperator)) {
        return undefined;
    }

    const featureMiddle = parseFeature(middleToken);
    const leftDimension = parseDimensionToken(firstTokenValue);
    const rightDimension = parseDimensionToken(lastToken);

    const ascendingConstraint = parseAscendingBoundedConstraint({
        featureMiddle,
        firstOperator,
        leftDimension,
        rightDimension,
        secondOperator,
    });

    if (isDefined(ascendingConstraint)) {
        return ascendingConstraint;
    }

    const featureFirst = parseFeature(firstTokenValue);
    const middleDimension = parseDimensionToken(middleToken);
    const lastDimension = parseDimensionToken(lastToken);

    return parseDescendingBoundedConstraint({
        featureFirst,
        firstOperator,
        lastDimension,
        middleDimension,
        secondOperator,
    });
}

function parseDescendingBoundedConstraint(
    input: Readonly<{
        featureFirst: ContainerSizeFeature | undefined;
        firstOperator: RangeOperator;
        lastDimension: ParsedDimension | undefined;
        middleDimension: ParsedDimension | undefined;
        secondOperator: RangeOperator;
    }>
): FeatureConstraint | undefined {
    if (
        !isDefined(input.featureFirst) ||
        !isDefined(input.middleDimension) ||
        !isDefined(input.lastDimension)
    ) {
        return undefined;
    }

    if (
        (input.firstOperator !== ">" && input.firstOperator !== ">=") ||
        (input.secondOperator !== ">" && input.secondOperator !== ">=")
    ) {
        return undefined;
    }

    return {
        feature: input.featureFirst,
        interval: {
            lower: {
                inclusive: input.secondOperator === ">=",
                unit: input.lastDimension.unit,
                value: input.lastDimension.value,
            },
            upper: {
                inclusive: input.firstOperator === ">=",
                unit: input.middleDimension.unit,
                value: input.middleDimension.value,
            },
        },
    };
}

function parseDimensionAt(
    value: string,
    startOffset: number
):
    | Readonly<{
          literal: string;
          nextIndex: number;
          unit: string;
          value: number;
      }>
    | undefined {
    let index = startOffset;

    if (index >= value.length) {
        return undefined;
    }

    const signCharacter = value[index];

    if (
        (signCharacter === "-" || signCharacter === "+") &&
        index + 1 < value.length
    ) {
        index += 1;
    }

    let hasDigit = false;

    while (index < value.length && isDigit(value[index])) {
        hasDigit = true;
        index += 1;
    }

    if (value[index] === ".") {
        index += 1;

        while (index < value.length && isDigit(value[index])) {
            hasDigit = true;
            index += 1;
        }
    }

    if (!hasDigit) {
        return undefined;
    }

    const numberToken = value.slice(startOffset, index);
    const unitStart = index;

    while (index < value.length && isUnitCharacter(value[index])) {
        index += 1;
    }

    if (unitStart === index) {
        return undefined;
    }

    const unit = value.slice(unitStart, index).toLowerCase();
    const parsedValue = Number(numberToken);

    if (!isNumberFinite(parsedValue)) {
        return undefined;
    }

    return {
        literal: `${numberToken}${unit}`,
        nextIndex: index,
        unit,
        value: parsedValue,
    };
}

function parseDimensionToken(token: string): ParsedDimension | undefined {
    const parsedDimension = parseDimensionAt(token, 0);

    if (
        !isDefined(parsedDimension) ||
        parsedDimension.nextIndex !== token.length
    ) {
        return undefined;
    }

    return {
        unit: parsedDimension.unit,
        value: parsedDimension.value,
    };
}

function parseExpressionConstraints(
    expression: string
): readonly FeatureConstraint[] {
    const legacyConstraint = parseLegacyConstraint(expression);

    if (isDefined(legacyConstraint)) {
        return [legacyConstraint];
    }

    return parseRangeSyntaxConstraints(tokenizeExpression(expression));
}

function parseFeature(token: string): ContainerSizeFeature | undefined {
    const normalized = token.trim().toLowerCase();

    return setHas(sizeFeatures, normalized) ? normalized : undefined;
}

function parseLegacyConstraint(
    expression: string
): FeatureConstraint | undefined {
    const separatorOffset = expression.indexOf(":");

    if (separatorOffset <= 0) {
        return undefined;
    }

    const left = expression.slice(0, separatorOffset).trim().toLowerCase();
    const right = firstToken(expression.slice(separatorOffset + 1));

    if (right === "") {
        return undefined;
    }

    const parsedDimension = parseDimensionToken(right);

    if (!isDefined(parsedDimension)) {
        return undefined;
    }

    if (left.startsWith("min-")) {
        const feature = parseFeature(left.slice(4));

        if (isDefined(feature)) {
            return {
                feature,
                interval: {
                    lower: {
                        inclusive: true,
                        unit: parsedDimension.unit,
                        value: parsedDimension.value,
                    },
                },
            };
        }
    }

    if (left.startsWith("max-")) {
        const feature = parseFeature(left.slice(4));

        if (isDefined(feature)) {
            return {
                feature,
                interval: {
                    upper: {
                        inclusive: true,
                        unit: parsedDimension.unit,
                        value: parsedDimension.value,
                    },
                },
            };
        }
    }

    return undefined;
}

function parseLegacyFeatureName(
    expression: string
): ContainerQueryFeatureName | undefined {
    const separatorOffset = expression.indexOf(":");

    if (separatorOffset <= 0) {
        return undefined;
    }

    const left = expression.slice(0, separatorOffset).trim().toLowerCase();

    if (left.startsWith("min-") || left.startsWith("max-")) {
        return parseSizeQueryFeatureName(left.slice(4));
    }

    return parseSizeQueryFeatureName(left);
}

function parseOperator(token: string): RangeOperator | undefined {
    switch (token) {
        case "<":
        case "<=":
        case ">":
        case ">=": {
            return token;
        }

        default: {
            return undefined;
        }
    }
}

function parseRangeSyntaxConstraints(
    tokens: readonly string[]
): readonly FeatureConstraint[] {
    if (tokens.length === 3) {
        const singleComparison = parseSingleComparison(tokens);

        return isDefined(singleComparison) ? [singleComparison] : [];
    }

    if (tokens.length === 5) {
        const boundedComparison = parseBoundedComparison(tokens);

        return isDefined(boundedComparison) ? [boundedComparison] : [];
    }

    return [];
}

function parseSingleComparison(
    tokens: readonly string[]
): FeatureConstraint | undefined {
    const [
        left = "",
        operatorToken = "",
        right = "",
    ] = tokens;
    const operator = parseOperator(operatorToken);

    if (!isDefined(operator)) {
        return undefined;
    }

    const leftFeature = parseFeature(left);
    const rightDimension = parseDimensionToken(right);

    if (isDefined(leftFeature) && isDefined(rightDimension)) {
        return createFeatureComparisonConstraint(
            leftFeature,
            operator,
            rightDimension
        );
    }

    const leftDimension = parseDimensionToken(left);
    const rightFeature = parseFeature(right);

    if (isDefined(leftDimension) && isDefined(rightFeature)) {
        return createReverseComparisonConstraint(
            leftDimension,
            operator,
            rightFeature
        );
    }

    return undefined;
}

function parseSizeQueryFeatureName(
    token: string
): ContainerQueryFeatureName | undefined {
    const normalized = token.trim().toLowerCase();

    return setHas(sizeQueryFeatureNames, normalized) ? normalized : undefined;
}

function pickStricterLowerBound(
    current: IntervalBound | undefined,
    candidate: IntervalBound
): IntervalBound {
    if (!isDefined(current)) {
        return candidate;
    }

    if (current.unit !== candidate.unit) {
        return current;
    }

    if (candidate.value > current.value) {
        return candidate;
    }

    if (candidate.value < current.value) {
        return current;
    }

    return current.inclusive && !candidate.inclusive ? candidate : current;
}

function pickStricterUpperBound(
    current: IntervalBound | undefined,
    candidate: IntervalBound
): IntervalBound {
    if (!isDefined(current)) {
        return candidate;
    }

    if (current.unit !== candidate.unit) {
        return current;
    }

    if (candidate.value < current.value) {
        return candidate;
    }

    if (candidate.value > current.value) {
        return current;
    }

    return current.inclusive && !candidate.inclusive ? candidate : current;
}

function sortLexicographically<Value extends string>(
    values: readonly Value[]
): readonly Value[] {
    const sorted: Value[] = [];

    for (const value of values) {
        const firstGreaterIndex = sorted.findIndex(
            (sortedValue) => value.localeCompare(sortedValue) < 0
        );
        const insertionIndex =
            firstGreaterIndex === -1 ? sorted.length : firstGreaterIndex;

        sorted.splice(insertionIndex, 0, value);
    }

    return sorted;
}

function tokenizeExpression(expression: string): readonly string[] {
    const tokens: string[] = [];
    let buffer = "";

    const pushBuffer = (): void => {
        if (buffer === "") {
            return;
        }

        tokens.push(buffer.toLowerCase());
        buffer = "";
    };

    for (let index = 0; index < expression.length; index += 1) {
        const character = expression[index] ?? "";

        if (isWhitespace(character)) {
            pushBuffer();
        } else if (character === "<" || character === ">") {
            pushBuffer();

            const nextCharacter = expression[index + 1];

            if (nextCharacter === "=") {
                tokens.push(`${character}=`);
                index += 1;
            } else {
                tokens.push(character);
            }
        } else {
            buffer += character;
        }
    }

    pushBuffer();

    return tokens;
}
