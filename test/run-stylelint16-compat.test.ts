import type { rm } from "node:fs/promises";

import * as nodePath from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
    createCompatibilityCheckCommands,
    type runCommand,
    runStylelint16Compat,
} from "../scripts/run-stylelint16-compat.mjs";

const testRootPath = nodePath.resolve("stylelint16-compat-test-root");
const testConsumerPath = nodePath.join(testRootPath, "consumer");
const testRepositoryPath = nodePath.join(testRootPath, "repository");

describe("stylelint 16 compatibility wrapper", () => {
    it("installs an exact Stylelint 16 in an isolated consumer without peer bypasses", () => {
        expect.hasAssertions();

        const commands = createCompatibilityCheckCommands({
            nodeCommand: "node",
            npmCommand: "npm",
            platform: "linux",
            stylelintCompatSmokeScriptPath: nodePath.join(
                testRootPath,
                "smoke.mjs"
            ),
            tarballPath: nodePath.join(testRootPath, "plugin.tgz"),
        });

        expect(commands).toHaveLength(2);
        expect(commands[0]).toStrictEqual({
            args: [
                "install",
                "--no-audit",
                "--no-fund",
                "--package-lock=false",
                "--save-exact",
                nodePath.join(testRootPath, "plugin.tgz"),
                "stylelint@16.26.1",
                "picocolors@1.1.1",
            ],
            command: "npm",
            shell: false,
        });
        expect(commands.flatMap(({ args }) => args)).not.toContain(
            "--legacy-peer-deps"
        );
        expect(commands[1]?.environment).toStrictEqual({
            STYLELINT_COMPAT_PLUGIN_PACKAGE:
                "stylelint-plugin-container-query-sanity",
        });
    });

    it("packs into the temporary consumer and removes it after success", async () => {
        expect.hasAssertions();

        const commands: Array<Parameters<typeof runCommand>[0]> = [];
        const copiedFiles: string[][] = [];
        const writtenFiles: string[][] = [];
        const remove = vi.fn<typeof rm>(() => Promise.resolve());

        await runStylelint16Compat({
            copyFileFn: (...paths) => {
                copiedFiles.push(paths.map(String));

                return Promise.resolve();
            },
            mkdtempFn: () => Promise.resolve(testConsumerPath),
            nodeCommand: "node",
            npmCommand: "npm",
            platform: "linux",
            repositoryRootPath: testRepositoryPath,
            rmFn: remove,
            runCommandFn: (command) => {
                commands.push(command);

                return command.captureOutput === true
                    ? JSON.stringify([
                          {
                              filename:
                                  "stylelint-plugin-container-query-sanity-0.1.3.tgz",
                          },
                      ])
                    : "";
            },
            stylelintCompatSmokeScriptPath: nodePath.join(
                testRepositoryPath,
                "scripts",
                "smoke.mjs"
            ),
            tmpDirectoryPath: testRootPath,
            writeFileFn: (...input) => {
                writtenFiles.push(input.slice(0, 2).map(String));

                return Promise.resolve();
            },
        });

        const copiedSmokeScriptPath = nodePath.join(
            testConsumerPath,
            "stylelint-compat-smoke.mjs"
        );

        expect(commands.map(({ args }) => args[0])).toStrictEqual([
            "run",
            "pack",
            "install",
            copiedSmokeScriptPath,
        ]);
        expect(copiedFiles).toStrictEqual([
            [
                nodePath.join(testRepositoryPath, "scripts", "smoke.mjs"),
                copiedSmokeScriptPath,
            ],
        ]);
        expect(writtenFiles.map(([path]) => path)).toStrictEqual([
            nodePath.join(testConsumerPath, "package.json"),
            nodePath.join(testConsumerPath, ".npmrc"),
        ]);
        expect(remove).toHaveBeenCalledExactlyOnceWith(testConsumerPath, {
            force: true,
            recursive: true,
        });
    });

    it("removes the temporary consumer when preparation fails", async () => {
        expect.hasAssertions();

        const remove = vi.fn<typeof rm>(() => Promise.resolve());

        await expect(
            runStylelint16Compat({
                mkdtempFn: () => Promise.resolve(testConsumerPath),
                platform: "linux",
                rmFn: remove,
                runCommandFn: () => {
                    throw new Error("build failed");
                },
                tmpDirectoryPath: testRootPath,
            })
        ).rejects.toThrow("build failed");
        expect(remove).toHaveBeenCalledExactlyOnceWith(testConsumerPath, {
            force: true,
            recursive: true,
        });
    });
});
