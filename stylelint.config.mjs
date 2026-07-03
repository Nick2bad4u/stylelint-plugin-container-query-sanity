import sharedConfig from "stylelint-config-nick2bad4u";

const unsupportedExtends = new Set([
    "stylelint-plugin-css-performance-budget/configs/performance-budget-all",
    "stylelint-plugin-docusaurus/configs/docusaurus-all",
    "stylelint-plugin-font/configs/font-all",
    "stylelint-plugin-grid/configs/grid-all",
]);
const unsupportedPlugins = new Set([
    "stylelint-plugin-css-performance-budget",
    "stylelint-plugin-docusaurus",
    "stylelint-plugin-font",
    "stylelint-plugin-grid",
]);
const unsupportedRulePrefixes = [
    "docusaurus/",
    "font/",
    "grid/",
    "performance-budget/",
];
const normalizedExtends = Array.isArray(sharedConfig.extends)
    ? sharedConfig.extends.filter(
          (entry) => typeof entry === "string" && !unsupportedExtends.has(entry)
      )
    : [];
const normalizedPlugins = Array.isArray(sharedConfig.plugins)
    ? sharedConfig.plugins.filter(
          (entry) => typeof entry === "string" && !unsupportedPlugins.has(entry)
      )
    : sharedConfig.plugins;
const sharedRules = sharedConfig.rules ?? {};
const normalizedRules = Object.fromEntries(
    Object.entries(sharedRules).filter(([ruleName]) =>
        unsupportedRulePrefixes.every((prefix) => !ruleName.startsWith(prefix))
    )
);
const normalizedOverrides = Array.isArray(sharedConfig.overrides)
    ? sharedConfig.overrides.map((override) => {
          if (override.rules === undefined) {
              return override;
          }

          const overrideRules = Object.fromEntries(
              Object.entries(override.rules).filter(([ruleName]) =>
                  unsupportedRulePrefixes.every(
                      (prefix) => !ruleName.startsWith(prefix)
                  )
              )
          );

          return {
              ...override,
              rules: overrideRules,
          };
      })
    : sharedConfig.overrides;

/** @type {import("stylelint").Config} */
const stylelintConfig = {
    ...sharedConfig,
    extends: normalizedExtends,
    rules: normalizedRules,
};

if (normalizedPlugins !== undefined) {
    stylelintConfig.plugins = normalizedPlugins;
}

if (normalizedOverrides !== undefined) {
    stylelintConfig.overrides = normalizedOverrides;
}

export default stylelintConfig;
