# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `useDebouncedQuery` is now exported from the package entry point.
- Test suites for `useNetworkStatus`, `useIntersectionObserver` and `useDebouncedQuery`.
- ESLint, Prettier, `.editorconfig`, `.nvmrc`, `npm run typecheck`, and a GitHub Actions CI workflow.
- `LICENSE`, `CONTRIBUTING.md` and this changelog.

### Changed

- The package is now ESM (`"type": "module"`) with an `exports` map and `sideEffects: false`.
- Stricter TypeScript configuration (`noUnused*`, `noImplicitReturns`, `isolatedModules`).

### Fixed

- `npm run build` and `npm test` failed because two specs lived in `src/tests/` with wrong import paths,
  and a placeholder `tests/composables.test.js` contained no tests.
- `useDebouncedQuery`: a superseded request could overwrite newer data or reset `loading`.
- `useEventBus` and `useNetworkStatus` triggered Vue lifecycle warnings when called outside a component.
- `useEventBus.once` kept the handler registered if it threw.
- `useLocalStorageState` leaked its `storage` listener after its effect scope was disposed.

## [1.1.0]

- Added `useAsyncQueue`, `useClipboardState`, `useMediaQuery`, `useEventBus` and `usePermissions`.
- Added `useVirtualList`, `useFormValidation` and `useLocalStorageState` suites.
