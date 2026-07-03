export interface ReadmeRuleModule {
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
              readonly url?: string | undefined;
          }
        | undefined;
    readonly ruleName?: string | undefined;
}

export function getReadmePath(repositoryRoot?: string): string;

export function isDirectExecution(input: {
    readonly argvEntry?: string | undefined;
    readonly currentImportUrl: string;
}): boolean;

export function loadBuiltRules(input?: {
    readonly builtPluginPath?: string | undefined;
    readonly importModule?:
        | ((modulePath: string) => Promise<
              Readonly<{
                  rules?:
                      Readonly<Record<string, ReadmeRuleModule>> | undefined;
              }>
          >)
        | undefined;
}): Promise<Readonly<Record<string, ReadmeRuleModule>>>;

export function generateReadmeRulesSectionFromRules(
    rules: Readonly<Record<string, ReadmeRuleModule>>
): string;

export function syncReadmeRulesTable(input: {
    readonly writeChanges: boolean;
    readonly loadRules?:
        (() => Promise<Readonly<Record<string, ReadmeRuleModule>>>) | undefined;
    readonly readFileFn?:
        ((filePath: string, encoding: "utf8") => Promise<string>) | undefined;
    readonly readmeFilePath?: string | undefined;
    readonly repositoryRootPath?: string | undefined;
    readonly rules?: Readonly<Record<string, ReadmeRuleModule>> | undefined;
    readonly writeFileFn?:
        | ((
              filePath: string,
              contents: string,
              encoding: "utf8"
          ) => Promise<void>)
        | undefined;
}): Promise<Readonly<{ changed: boolean; readmeFilePath: string }>>;

export function runCli(input?: {
    readonly cliArgs?: readonly string[] | undefined;
    readonly loadRules?:
        (() => Promise<Readonly<Record<string, ReadmeRuleModule>>>) | undefined;
    readonly repositoryRootPath?: string | undefined;
}): Promise<void>;
