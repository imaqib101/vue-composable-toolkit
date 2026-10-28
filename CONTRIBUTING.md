# Contributing

Thanks for helping improve vue-composable-toolkit.

## Setup

```bash
nvm use        # Node version from .nvmrc
npm ci
```

## Workflow

1. Create a branch from the default branch (`feat/...`, `fix/...`, `docs/...`).
2. Add or change code under `src/composables/`, and export new composables from `src/index.ts`
   (use the `.js` extension in the specifier).
3. Add a spec in `tests/<name>.spec.ts`. Bug fixes need a regression test.
4. Run the full check before opening a pull request:

```bash
npm run lint
npm run format:check   # or `npm run format` to fix
npm run typecheck
npm run build
npm test
```

CI runs the same steps on Node 18, 20 and 22.

## Guidelines

- Composables must be SSR-safe: guard `window`/`navigator` access.
- Register lifecycle hooks only when `getCurrentInstance()` (or `getCurrentScope()`) is set, so
  composables work outside components without Vue warnings.
- Clean up listeners, timers and observers.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Record user-facing changes in `CHANGELOG.md` under "Unreleased".
