export interface Stylelint16CompatCommandSpec {
    readonly args: readonly string[];
    readonly command: string;
    readonly shell: boolean;
}

export function getNpmCommand(platform?: string): string;

export function getWindowsCommandShell(environment?: NodeJS.ProcessEnv): string;

export function isDirectExecution(input: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl: string;
}): boolean;

export function createCompatibilityCheckCommands(input?: {
    readonly nodeCommand?: string | undefined;
    readonly npmCommand?: string | undefined;
    readonly platform?: string | undefined;
    readonly stylelintCompatSmokeScriptPath?: string | undefined;
}): readonly Stylelint16CompatCommandSpec[];

export function createRestoreDependenciesCommand(input?: {
    readonly npmCommand?: string | undefined;
    readonly platform?: string | undefined;
}): Stylelint16CompatCommandSpec;

export function runCommand(input: {
    readonly args: readonly string[];
    readonly command: string;
    readonly repositoryRootPath?: string | undefined;
    readonly shell?: boolean | undefined;
    readonly windowsCommandShell?: string | undefined;
}): void;

export function runStylelint16Compat(input?: {
    readonly copyFileFn?:
        typeof import("node:fs/promises").copyFile | undefined;
    readonly cpFn?: typeof import("node:fs/promises").cp | undefined;
    readonly mkdtempFn?: ((prefix: string) => Promise<string>) | undefined;
    readonly nodeCommand?: string | undefined;
    readonly npmCommand?: string | undefined;
    readonly packageJsonPath?: string | undefined;
    readonly packageLockJsonPath?: string | undefined;
    readonly platform?: string | undefined;
    readonly repositoryRootPath?: string | undefined;
    readonly rmFn?: typeof import("node:fs/promises").rm | undefined;
    readonly runCommandFn?:
        | ((
              input: Stylelint16CompatCommandSpec & {
                  readonly repositoryRootPath?: string | undefined;
                  readonly windowsCommandShell?: string | undefined;
              }
          ) => void)
        | undefined;
    readonly stylelintCompatSmokeScriptPath?: string | undefined;
    readonly tmpDirectoryPath?: string | undefined;
    readonly windowsCommandShell?: string | undefined;
}): Promise<void>;

export function runCli(): Promise<void>;
