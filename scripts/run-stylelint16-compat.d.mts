export interface Stylelint16CompatCommandSpec {
    readonly args: readonly string[];
    readonly command: string;
    readonly environment?: Readonly<Record<string, string>> | undefined;
    readonly shell: boolean;
}

export function getNpmCommand(platform?: string): string;

export function getWindowsCommandShell(environment?: NodeJS.ProcessEnv): string;

export function isDirectExecution(input: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl: string;
}): boolean;

export function createCompatibilityCheckCommands(input: {
    readonly nodeCommand?: string | undefined;
    readonly npmCommand?: string | undefined;
    readonly platform?: string | undefined;
    readonly stylelintCompatSmokeScriptPath: string;
    readonly tarballPath: string;
}): readonly Stylelint16CompatCommandSpec[];

export function runCommand(input: {
    readonly args: readonly string[];
    readonly captureOutput?: boolean | undefined;
    readonly command: string;
    readonly environment?: Readonly<Record<string, string>> | undefined;
    readonly repositoryRootPath?: string | undefined;
    readonly shell?: boolean | undefined;
    readonly windowsCommandShell?: string | undefined;
}): string;

export function runStylelint16Compat(input?: {
    readonly copyFileFn?:
        typeof import("node:fs/promises").copyFile | undefined;
    readonly mkdtempFn?: ((prefix: string) => Promise<string>) | undefined;
    readonly nodeCommand?: string | undefined;
    readonly npmCommand?: string | undefined;
    readonly platform?: string | undefined;
    readonly repositoryRootPath?: string | undefined;
    readonly rmFn?: typeof import("node:fs/promises").rm | undefined;
    readonly runCommandFn?: typeof runCommand | undefined;
    readonly stylelintCompatSmokeScriptPath?: string | undefined;
    readonly tmpDirectoryPath?: string | undefined;
    readonly windowsCommandShell?: string | undefined;
    readonly writeFileFn?:
        typeof import("node:fs/promises").writeFile | undefined;
}): Promise<void>;

export function runCli(): Promise<void>;
