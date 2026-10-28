# vue-composable-toolkit

[![CI](https://github.com/imaqib101/vue-composable-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/imaqib101/vue-composable-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Vue 3.3+](https://img.shields.io/badge/Vue-3.3%2B-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-007ACC?logo=typescript&logoColor=white)

A small collection of Vue 3 composables written in strict TypeScript. ESM only, tree-shakeable
(`sideEffects: false`), with `vue` as a peer dependency.

## Installation

The package is not published to npm yet. Install it from GitHub:

```bash
npm install github:imaqib101/vue-composable-toolkit vue
```

Requires Vue `^3.3.0` and Node 18+ for tooling.

## Composables

All composables are exported from the package root: `import { useX } from "vue-composable-toolkit"`.
Every composable is SSR-safe (it guards `window`/`navigator`) and works outside components; lifecycle
hooks are only registered when called inside `setup()`.

| Composable                | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `useDebouncedRef`         | Ref whose value updates after a quiet period                           |
| `useThrottledRef`         | Ref whose updates are rate-limited (leading/trailing)                  |
| `useDebouncedQuery`       | Debounced async fetch for a query ref, with abort and no stale results |
| `useVirtualList`          | Windowed rendering for long lists with fixed item height               |
| `useFormValidation`       | Reactive form state with sync/async per-field rules                    |
| `useLocalStorageState`    | Ref persisted to `localStorage`, synced across tabs                    |
| `useNetworkStatus`        | Online state and Network Information API details                       |
| `useIntersectionObserver` | Reactive `IntersectionObserver` for a template ref                     |
| `useMediaQuery`           | Reactive `matchMedia` result                                           |
| `useClipboardState`       | Copy to clipboard with a transient `copied` flag                       |
| `useAsyncQueue`           | Concurrency-limited promise queue with retries and pause               |
| `useEventBus`             | Typed in-memory event emitter                                          |
| `usePermissions`          | Role/permission checks as computed values                              |

### useDebouncedRef

```ts
const { value, isPending, cancel, flush } = useDebouncedRef("", 300); // or { delay: 300 }
value.value = "abc"; // `value.value` updates after 300 ms of silence
flush(); // apply the pending value now (optionally flush(newValue))
cancel(); // drop the pending value
```

### useThrottledRef

```ts
const count = useThrottledRef(0, { delay: 200, leading: true, trailing: true });
```

Returns a plain `Ref<T>`. Defaults: `delay` 300, `leading` true, `trailing` true.

### useDebouncedQuery

```ts
const query = ref("");
const { data, loading, error } = useDebouncedQuery(
  (q, signal) => fetch(`/api/search?q=${q}`, { signal }).then((r) => r.json()),
  query,
  { debounceMs: 300, initialValue: [] }
);
```

Superseded requests are aborted and their results ignored. A blank query resets `data` to
`initialValue` without calling the fetcher.

### useVirtualList

```ts
const {
  virtualRows,
  totalHeight,
  offsetY,
  scrollTop,
  containerProps,
  wrapperProps,
  scrollToIndex
} = useVirtualList({ items, itemHeight: 48, containerHeight: 600, overscan: 3 });
```

```vue
<div v-bind="containerProps">
  <div :style="wrapperProps.style.value">
    <div v-for="row in virtualRows" :key="row.index" style="height: 48px">{{ row.data.name }}</div>
  </div>
</div>
```

`items` may be an array or a ref. `virtualRows` holds `{ data, index }` entries. In templates,
`wrapperProps.style` is a computed, so pass `wrapperProps.style.value`
(it is not auto-unwrapped because `wrapperProps` is a plain object).

### useFormValidation

```ts
const form = useFormValidation({
  email: { initialValue: "", rules: [(v) => (v.includes("@") ? null : "Invalid email")] },
  username: { initialValue: "", rules: [async (v) => ((await isFree(v)) ? null : "Taken")] }
});

form.setFieldValue("email", "a@b.c"); // marks dirty and validates
await form.validateField("email"); // boolean
await form.validateAll(); // marks all touched
const submit = form.handleSubmit(async (values) => save(values)); // use as @submit handler
form.resetForm();
```

Returned: `values`, `errors`, `isDirtyField`, `isTouchedField`, `isValidatingField`, `isValid`,
`isDirty`, `isValidating`, `isSubmitting`, `validateField`, `validateAll`, `setFieldValue`,
`setFieldTouched`, `resetForm`, `handleSubmit`. A rule returns an error message or `null`; rules for a
field run in order and stop at the first error.

### useLocalStorageState

```ts
const prefs = useLocalStorageState("prefs", { theme: "dark" }, { syncTabs: true });
prefs.value.theme = "light"; // persisted (deep watch)
```

Options: `serializer` (default `JSON.stringify`), `deserializer` (default `JSON.parse`),
`onError` (default `console.error`), `syncTabs` (default `true`). Setting the value to
`null`/`undefined` removes the key. The `storage` listener is removed when the owning effect scope is
disposed.

### useNetworkStatus

```ts
const { isOnline, downlink, rtt, effectiveType, saveData } = useNetworkStatus();
```

`downlink`, `rtt` and `effectiveType` are `null` where the Network Information API is unavailable.

### useIntersectionObserver

```ts
const { targetRef, isIntersecting, stop } = useIntersectionObserver({
  root: null,
  rootMargin: "0px",
  threshold: 0,
  freezeOnceVisible: false
});
```

Bind `targetRef` with `ref="targetRef"`. Where `IntersectionObserver` is missing, `isIntersecting` is `true`.

### useMediaQuery

```ts
const isWide = useMediaQuery("(min-width: 1024px)", { defaultValue: false });
```

### useClipboardState

```ts
const { copy, copied, text, error, isSupported } = useClipboardState({ timeout: 2000 });
const ok = await copy("hello"); // false (and `error` set) if unsupported or rejected
```

### useAsyncQueue

```ts
const queue = useAsyncQueue({ concurrency: 2, maxRetries: 1, retryDelayMs: 50 });
const result = await queue.push(() => fetchThing(), "optional-id");
await queue.onIdle();
```

Returned: `pendingCount`, `activeCount`, `completedCount`, `failedCount`, `isPaused`, `push`,
`pause`, `resume`, `clear` (rejects queued tasks with `Error("Queue cleared")`), `onIdle`.

### useEventBus

```ts
const bus = useEventBus<{ greet: string }>({ onError: (err, event) => report(err, event) });
const off = bus.on("greet", (name) => console.log(name));
bus.once("greet", handler);
bus.emit("greet", "world");
bus.off("greet", handler); // or bus.off("greet") to remove all handlers
bus.listenerCount("greet");
bus.clear(); // also called automatically on component unmount
```

Handler errors are routed to `onError`, or `console.error` if not provided.

### usePermissions

```ts
const perms = usePermissions({
  roles: ["editor"],
  permissions: ["export"],
  roleMap: { editor: ["post:write"] }
});
perms.hasPermission("post:write").value; // true
perms.hasAnyPermission("a", "b"); // ComputedRef<boolean>
perms.hasAllPermissions("a", "b"); // ComputedRef<boolean>
perms.hasRole("editor"); // ComputedRef<boolean>
perms.grantRole("admin");
perms.revokeRole("admin");
perms.grantPermission("x");
perms.revokePermission("x");
```

Also returns `activeRoles` and `activePermissions` (explicit permissions plus those derived from roles).

## Development

```bash
npm ci
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # src + tests
npm run build         # emit dist/
npm test              # Vitest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Mohammed Aqib
