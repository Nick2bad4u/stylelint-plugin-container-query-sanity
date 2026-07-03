# stylelint-plugin-container-query-sanity

[![npm license.](https://flat.badgen.net/npm/license/stylelint-plugin-container-query-sanity?color=purple)](https://github.com/Nick2bad4u/stylelint-plugin-container-query-sanity/blob/main/LICENSE) [![npm total downloads.](https://flat.badgen.net/npm/dt/stylelint-plugin-container-query-sanity?color=pink)](https://www.npmjs.com/package/stylelint-plugin-container-query-sanity) [![latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/stylelint-plugin-container-query-sanity?color=cyan)](https://github.com/Nick2bad4u/stylelint-plugin-container-query-sanity/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/stylelint-plugin-container-query-sanity?color=yellow)](https://github.com/Nick2bad4u/stylelint-plugin-container-query-sanity/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/stylelint-plugin-container-query-sanity?color=green)](https://github.com/Nick2bad4u/stylelint-plugin-container-query-sanity/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/stylelint-plugin-container-query-sanity?color=red)](https://github.com/Nick2bad4u/stylelint-plugin-container-query-sanity/issues) [![codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/stylelint-plugin-container-query-sanity?color=blue)](https://codecov.io/gh/Nick2bad4u/stylelint-plugin-container-query-sanity)

Stylelint rules and shareable configs for container query correctness: named-container targeting, interval sanity checks, and breakpoint token hygiene.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Exports](#exports)
- [Configs](#configs)
- [Rules](#rules)
- [Documentation](#documentation)
- [Contributors ✨](#contributors-)

## Installation

```sh
npm install --save-dev stylelint stylelint-plugin-container-query-sanity
```

### Compatibility

- **Supported Stylelint versions:** `16.x` and `17.x`
- **Config system:** ESM config files such as `stylelint.config.mjs`
- **Node.js runtime:** `>=22.0.0`

## Quick start

Use the plugin-scoped recommended shareable config:

```js
import { containerQuerySanityPluginConfigs } from "stylelint-plugin-container-query-sanity";

export default containerQuerySanityPluginConfigs["container-query-recommended"];
```

Or consume it from `extends`:

```js
export default {
 extends: [
  "stylelint-config-standard",
  "stylelint-plugin-container-query-sanity/configs/container-query-recommended",
 ],
};
```

Manual plugin registration:

```js
export default {
 plugins: ["stylelint-plugin-container-query-sanity"],
 rules: {
  "container-query-sanity/require-named-container": true,
 },
};
```

## Exports

The package exports:

- default Stylelint plugin pack (`default`)
- `containerQuerySanityPluginConfigs`
- `configNames`, `ruleNames`, `ruleIds`, `rules`, and `meta`
- extends-ready subpath configs:
  - `stylelint-plugin-container-query-sanity/configs/container-query-recommended`
  - `stylelint-plugin-container-query-sanity/configs/container-query-all`
  - `stylelint-plugin-container-query-sanity/configs/container-query-strict`

## Configs

| Config key                                                            | Purpose                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 🟡 `containerQuerySanityPluginConfigs["container-query-recommended"]` | Low-noise baseline for named containers and interval sanity checks.  |
| 🟣 `containerQuerySanityPluginConfigs["container-query-all"]`         | Enables every public `container-query-sanity/*` rule.                |
| 🔴 `containerQuerySanityPluginConfigs["container-query-strict"]`      | Includes recommended rules plus strict breakpoint-token enforcement. |

## Rules

**Fix legend:**

- 🔧 = autofixable
- — = report only

**Preset key legend:**

- [🟡](./docs/rules/configs/container-query-recommended.md) — `containerQuerySanityPluginConfigs["container-query-recommended"]`
- [🟣](./docs/rules/configs/container-query-all.md) — `containerQuerySanityPluginConfigs["container-query-all"]`
- [🔴](./docs/rules/configs/container-query-strict.md) — `containerQuerySanityPluginConfigs["container-query-strict"]`

| Rule                                                                                                                                                                                         | Fix | Preset key                                                                                                                                                       | Description                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`no-block-axis-query-on-inline-size-container`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-block-axis-query-on-inline-size-container)               |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow block-axis size features in queries targeting inline-size-only containers.                             |
| [`no-conflicting-container-name-declarations`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-conflicting-container-name-declarations)                   |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow reusing the same container name with conflicting static container-type declarations.                   |
| [`no-degenerate-container-query-conditions`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-degenerate-container-query-conditions)                       |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow redundant lower bounds that are always true for non-negative container sizes.                          |
| [`no-invalid-container-query-ranges`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-invalid-container-query-ranges)                                     |  —  | [🟡](./docs/rules/configs/container-query-recommended.md) [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md) | Disallow contradictory or mixed-unit ranges in container size queries.                                          |
| [`no-scroll-state-query-on-non-scroll-state-container`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-scroll-state-query-on-non-scroll-state-container) |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow scroll-state() queries that target names not declared with scroll-state containment.                   |
| [`no-size-query-on-non-size-container`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-size-query-on-non-size-container)                                 |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow size-feature @container queries that target names declared without size-capable container-type values. |
| [`no-unknown-container-names`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-unknown-container-names)                                                   |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow @container names that are never declared via container-name/container in the same stylesheet.          |
| [`no-unreachable-container-intervals`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/no-unreachable-container-intervals)                                   |  —  | [🟡](./docs/rules/configs/container-query-recommended.md) [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md) | Disallow nested @container conditions whose intervals cannot overlap with parent container ranges.              |
| [`prefer-logical-size-features`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/prefer-logical-size-features)                                               |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Prefer logical inline-size/block-size features over physical width/height in container queries.                 |
| [`prefer-range-syntax`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/prefer-range-syntax)                                                                 |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Disallow legacy min-/max- container size syntax and require modern range comparison syntax.                     |
| [`require-breakpoint-token-usage`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/require-breakpoint-token-usage)                                           |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Require container breakpoints to come from tokenized values instead of hardcoded length literals.               |
| [`require-container-type-for-named-containers`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/require-container-type-for-named-containers)                 |  —  | [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md)                                                           | Require named containers used by size or scroll-state queries to declare an explicit container-type.            |
| [`require-named-container`](https://nick2bad4u.github.io/stylelint-plugin-container-query-sanity/docs/rules/require-named-container)                                                         |  —  | [🟡](./docs/rules/configs/container-query-recommended.md) [🔴](./docs/rules/configs/container-query-strict.md) [🟣](./docs/rules/configs/container-query-all.md) | Require every @container rule to target an explicit, valid container name.                                      |

## Documentation

- [Overview](./docs/rules/overview.md)
- [Getting Started](./docs/rules/getting-started.md)
- [Current Status](./docs/rules/guides/current-status.md)
- [Configs](./docs/rules/configs/index.md)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.
Contributions of any kind are welcome.
