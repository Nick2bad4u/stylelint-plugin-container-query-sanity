export interface ConfigMatrixRuleModule {
    readonly docs?:
        | {
              readonly description: string;
              readonly recommended: boolean;
              readonly url: string;
          }
        | undefined;
    readonly meta?:
        | {
              readonly fixable?: boolean | undefined;
          }
        | undefined;
}

export interface ConfigMatrixConfigModule {
    readonly rules?: Readonly<Record<string, unknown>> | undefined;
}

export interface ConfigMatrixBuiltPluginModule {
    readonly configNames?: unknown;
    readonly configs?:
        Readonly<Record<string, ConfigMatrixConfigModule>> | undefined;
    readonly rules?:
        Readonly<Record<string, ConfigMatrixRuleModule>> | undefined;
}

export interface ConfigMatrixMetadata {
    readonly configNames: readonly string[];
    readonly configs: Readonly<Record<string, ConfigMatrixConfigModule>>;
    readonly rules: Readonly<Record<string, ConfigMatrixRuleModule>>;
}

export function normalizeConfigNames(
    configNamesValue: unknown,
    configs: Readonly<Record<string, ConfigMatrixConfigModule>>
): readonly string[];

export function isDirectExecution(input: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl: string;
}): boolean;

export function parseCliArgs(cliArgs: readonly string[]): {
    readonly writeChanges: boolean;
};

export function loadBuiltPluginMetadata(input?: {
    readonly builtPluginPath?: string;
    readonly importModule?: (
        modulePath: string
    ) => Promise<ConfigMatrixBuiltPluginModule>;
}): Promise<ConfigMatrixMetadata>;

export function getConfigDocPath(
    configName: string,
    repositoryRoot?: string
): string;

export function resolveConfigDocTargets(input: {
    readonly configNames: readonly string[];
    readonly hasDocFile?: (path: string) => Promise<boolean>;
    readonly repositoryRoot?: string;
}): Promise<
    readonly Readonly<{
        configDocPath: string;
        configName: string;
    }>[]
>;

export function generateRulesSectionFromConfig(input: {
    readonly configName: string;
    readonly configs: Readonly<Record<string, ConfigMatrixConfigModule>>;
    readonly rules: Readonly<Record<string, ConfigMatrixRuleModule>>;
}): string;

export function syncConfigDocs(input: {
    readonly hasDocFile?: (path: string) => Promise<boolean>;
    readonly loadPluginMetadata?:
        (() => Promise<ConfigMatrixMetadata>) | undefined;
    readonly metadata?: ConfigMatrixMetadata | undefined;
    readonly readFileFn?:
        ((filePath: string, encoding: "utf8") => Promise<string>) | undefined;
    readonly repositoryRootPath?: string | undefined;
    readonly writeChanges: boolean;
    readonly writeFileFn?:
        | ((
              filePath: string,
              contents: string,
              encoding: "utf8"
          ) => Promise<void>)
        | undefined;
}): Promise<
    Readonly<{
        changed: boolean;
        updatedFilePaths: readonly string[];
    }>
>;

export function runCli(input?: {
    readonly cliArgs?: readonly string[] | undefined;
    readonly legacyAlias?: boolean;
    readonly loadPluginMetadata?:
        (() => Promise<ConfigMatrixMetadata>) | undefined;
    readonly repositoryRootPath?: string | undefined;
}): Promise<void>;
