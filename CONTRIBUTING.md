# Contributing to stylelint-plugin-container-query-sanity

Thanks for your interest in contributing.

This repository contains a Stylelint plugin template focused on Docusaurus styling conventions and future Docusaurus-specific CSS rules.

## Prerequisites

- Node.js `>=22.0.0` (see `package.json#engines`)
- npm `12.0.2` (see `package.json#packageManager`)
- Git

## Local setup

1. Fork and clone the repository.

2. Install dependencies from the repository root:

   ```bash
   npm ci
   ```

3. Run the main quality gate:

   ```bash
   npm run lint:all:fix:quiet
   npm run typecheck
   npm test
   ```

## Recommended development workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Add or update tests in `test/` when behavior changes.
4. Update relevant documentation in `docs/` and root docs when needed.
5. Run validation commands before opening a pull request.

## Project layout

```text
.
├── src/                  # Plugin source and shared helpers
├── test/                 # Vitest-based Stylelint tests and helpers
├── docs/                 # Rule docs and Docusaurus docs app
├── scripts/              # Repository scripts and sync helpers
├── .github/              # Workflows and automation configs
└── package.json          # Scripts, dependencies, metadata
```

## Validation commands

Use these commands locally before submitting a pull request:

- `npm run typecheck`
- `npm test`
- `npm run lint:all:fix:quiet`
- `npm run sync:readme-rules-table:write`
- `npm run sync:configs-rules-matrix:write`

## Documentation and sync workflow

When you change public rule/config metadata or docs-driven surfaces:

1. update the canonical source code/docs
2. run the relevant sync script
3. re-run the affected validation commands

This repository prefers generated consistency over hand-editing derived tables.

## Commit guidance

Gitmoji + Conventional type commits are recommended because release notes and changelog tooling are commit-message aware.

Format:

- `:gitmoji: [type](scope?): subject`

Examples:

- `:sparkles: [feat](rule) add first Docusaurus theme-token rule`
- `:bug: [fix](docs) correct config usage example`
- `:memo: [docs] refine getting-started guide`

## Pull request expectations

- Keep pull requests scoped and reviewable.
- Include tests for behavior changes.
- Keep docs in sync with implementation changes.
- Do not include unrelated generated churn.

## Security

Do not open public issues for potential vulnerabilities.
Use the process described in [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree your contributions are licensed under the
[MIT License](./LICENSE).
