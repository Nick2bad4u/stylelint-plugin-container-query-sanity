export type NodeVersionSyncResult =
    | "updated"
    | "validated"
    | "validated-current";

export function normalizeNodeVersion(version: unknown): string;

export function isRecord(value: unknown): value is Record<string, unknown>;

export function isDirectExecution(input?: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl?: string;
}): boolean;

export function parseArguments(argumentList: readonly string[]): {
    readonly checkCurrent: boolean;
    readonly checkOnly: boolean;
    readonly explicitVersion: string | null;
};

export function readPackageJson(
    filePath?: string
): Promise<Record<string, unknown>>;

export function resolveMinimumEngineVersion(
    enginesValue: unknown
): string | null;

export function compareExactVersions(
    leftVersion: string,
    rightVersion: string
): number;

export function assertPreferredVersionSupported(
    preferredVersion: string,
    minimumEngineVersion: string | null
): void;

export function readOptionalVersionFile(
    filePath: string
): Promise<string | null>;

export function writeVersionFiles(input: {
    readonly preferredVersion: string;
    readonly nodeVersionFilePath?: string | undefined;
    readonly nvmrcFilePath?: string | undefined;
}): Promise<string>;

export function validateVersionFiles(input: {
    readonly expectedVersion: string | null;
    readonly minimumEngineVersion?:
        | string
        | null
        | undefined;
    readonly logger?:
        | {
              readonly log: (...args: readonly unknown[]) => void;
          }
        | undefined;
    readonly nodeVersionFilePath?: string | undefined;
    readonly nvmrcFilePath?: string | undefined;
}): Promise<string>;

export function synchronizeNodeVersionFiles(input?: {
    readonly argumentList?: readonly string[] | undefined;
    readonly currentRuntimeVersion?: string | undefined;
    readonly logger?:
        | {
              readonly log: (...args: readonly unknown[]) => void;
          }
        | undefined;
    readonly packageJsonPath?: string | undefined;
    readonly nodeVersionFilePath?: string | undefined;
    readonly nvmrcFilePath?: string | undefined;
}): Promise<NodeVersionSyncResult>;

export function runCli(input?: {
    readonly argumentList?: readonly string[] | undefined;
    readonly currentRuntimeVersion?: string | undefined;
    readonly logger?:
        | {
              readonly error: (...args: readonly unknown[]) => void;
              readonly log: (...args: readonly unknown[]) => void;
          }
        | undefined;
    readonly packageJsonPath?: string | undefined;
    readonly nodeVersionFilePath?: string | undefined;
    readonly nvmrcFilePath?: string | undefined;
}): Promise<number>;
