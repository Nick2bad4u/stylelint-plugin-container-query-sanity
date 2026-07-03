export interface ConfigScenario {
    readonly code: string;
    readonly config: import("stylelint").Config;
    readonly codeFilename: string;
    readonly name: string;
}

export interface StylelintResultLike {
    readonly invalidOptionWarnings?: readonly unknown[];
    readonly parseErrors?: readonly unknown[];
    readonly warnings?: readonly unknown[];
}

export interface StylelintLike {
    lint(input: {
        readonly code: string;
        readonly codeFilename: string;
        readonly config: import("stylelint").Config;
    }): Promise<{
        readonly results: readonly StylelintResultLike[];
    }>;
}

export interface BuiltPluginSurface {
    readonly builtPluginCjs: unknown;
    readonly configNames: readonly string[];
    readonly containerQuerySanityPluginConfigs: {
        readonly "container-query-all": import("stylelint").Config & {
            readonly plugins: (string | import("stylelint").Plugin)[];
            readonly rules: Readonly<Record<string, unknown>>;
        };
        readonly "container-query-recommended": import("stylelint").Config & {
            readonly plugins: (string | import("stylelint").Plugin)[];
            readonly rules: Readonly<Record<string, unknown>>;
        };
        readonly "container-query-strict": import("stylelint").Config & {
            readonly plugins: (string | import("stylelint").Plugin)[];
            readonly rules: Readonly<Record<string, unknown>>;
        };
    };
    readonly meta: {
        readonly name: string;
        readonly namespace: string;
    };
    readonly plugin: (string | import("stylelint").Plugin)[];
    readonly ruleIds: readonly string[];
    readonly ruleNames: readonly string[];
    readonly rules: Readonly<
        Record<
            string,
            {
                readonly ruleName: string;
            }
        >
    >;
}

export function parseExpectedStylelintMajor(
    argv: readonly string[]
): number | undefined;

export function isDirectExecution(input: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl: string;
}): boolean;

export function normalizeStylelintRuntime(
    runtimeCandidate: unknown
): StylelintLike;

export function assertStylelintMajor(
    expectedMajor: number | undefined,
    input: {
        readonly logger?: Pick<Console, "log"> | undefined;
        readonly runtimeVersion: string;
    }
): number;

export function assertPluginSurface(
    surface: BuiltPluginSurface,
    input?: {
        readonly logger?: Pick<Console, "log"> | undefined;
    }
): void;

export function createScenarios(
    input: Pick<
        BuiltPluginSurface,
        "containerQuerySanityPluginConfigs" | "plugin"
    >
): readonly ConfigScenario[];

export function runConfigScenario(
    scenario: ConfigScenario,
    input: {
        readonly logger?: Pick<Console, "log"> | undefined;
        readonly stylelint: StylelintLike;
    }
): Promise<void>;

export function runStylelintCompatSmoke(input?: {
    readonly argv?: readonly string[];
    readonly loadBuiltPluginSurfaceFn?:
        (() => Promise<BuiltPluginSurface>) | undefined;
    readonly loadStylelintFn?: (() => Promise<StylelintLike>) | undefined;
    readonly logger?: Pick<Console, "log"> | undefined;
    readonly stylelintRuntimeVersion?: string | undefined;
}): Promise<void>;

export function runCli(input?: {
    readonly argv?: readonly string[];
    readonly logger?: Pick<Console, "error" | "log"> | undefined;
}): Promise<number>;
