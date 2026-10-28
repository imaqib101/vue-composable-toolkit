# Vue Composable Toolkit ⚡

[![Vue 3](https://img.shields.io/badge/Vue-3.4+-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tree-shakeable](https://img.shields.io/badge/ESM-Tree--shakeable-success?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A high-performance, tree-shakeable collection of **Enterprise Vue 3 Composables** written in strict TypeScript. Built for complex data-dense frontend applications requiring rock-solid reactivity, virtual scrolling, reactive form validation pipelines, and cross-tab storage synchronization.

---

## 📦 Composable Catalog

| Composable                | Category                | Description                            | Key Capabilities                                                     |
| :------------------------ | :---------------------- | :------------------------------------- | :------------------------------------------------------------------- |
| `useVirtualList`          | **Performance**         | High-density virtual scrolling window  | Dynamic offsets, overscan buffers, programmatic `scrollToIndex`      |
| `useFormValidation`       | **State & Forms**       | Reactive form validation pipeline      | Field dirty/touched flags, async validators, debounced execution     |
| `useLocalStorageState`    | **State & Persistence** | Synchronized cross-tab storage         | SSR-safe, custom (de)serialization, `StorageEvent` listeners         |
| `useNetworkStatus`        | **Hardware & Web API**  | Network connection & quality telemetry | Effective connection type (`4g`/`3g`), downlink, RTT, online/offline |
| `useIntersectionObserver` | **DOM & Visibility**    | Viewport visibility tracker            | Configurable thresholds, root margins, `freezeOnceVisible`           |
| `useDebouncedRef`         | **Timing Primitives**   | Debounced reactive state               | Immediate flush, pending state tracking, manual cancellation         |
| `useThrottledRef`         | **Timing Primitives**   | Throttled reactive state               | Configurable leading & trailing edge execution                       |

---

## 🚀 Usage Guide

### 1. `useVirtualList` — Virtual Scrolling for Massive Datasets

Render tens of thousands of items with zero frame drops:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useVirtualList } from "vue-composable-toolkit";

const items = ref(Array.from({ length: 50000 }, (_, i) => ({ id: i, name: `User #${i}` })));

const { virtualRows, totalHeight, offsetY, containerProps, wrapperProps, scrollToIndex } =
  useVirtualList({
    items,
    itemHeight: 48,
    containerHeight: 600,
    overscan: 5
  });
</script>

<template>
  <div v-bind="containerProps" class="virtual-container">
    <div v-bind="wrapperProps" class="virtual-wrapper">
      <div
        v-for="row in virtualRows"
        :key="row.data.id"
        class="virtual-row"
        :style="{ height: '48px' }"
      >
        <span>{{ row.data.name }}</span>
      </div>
    </div>
  </div>
</template>
```

---

### 2. `useFormValidation` — Enterprise Reactive Forms

Field-level synchronous & asynchronous validation with dirty state tracking:

```typescript
import { useFormValidation } from "vue-composable-toolkit";

const form = useFormValidation({
  email: {
    initialValue: "",
    rules: [
      (v) => (!v ? "Email is required" : null),
      (v) => (!v.includes("@") ? "Invalid email domain" : null)
    ]
  },
  username: {
    initialValue: "",
    rules: [
      async (v) => {
        const available = await checkUsernameAvailability(v);
        return available ? null : "Username is already taken";
      }
    ]
  }
});

const submit = form.handleSubmit(async (values) => {
  await api.post("/users", values);
});
```

---

### 3. `useLocalStorageState` — Cross-Tab Synchronized Storage

Fully typed, SSR-compatible, and reactive across browser tabs:

```typescript
import { useLocalStorageState } from "vue-composable-toolkit";

interface UserPreferences {
  theme: "dark" | "light";
  fontSize: number;
}

const prefs = useLocalStorageState<UserPreferences>(
  "app_prefs",
  {
    theme: "dark",
    fontSize: 14
  },
  { syncTabs: true }
);

// Mutating prefs automatically persists to localStorage and synchronizes across all open browser tabs!
prefs.value.theme = "light";
```

---

## 🧪 Testing

Every composable is verified against strict Vitest suites testing lifecycle mounting, unmounting cleanup, and edge conditions:

```bash
npm test
```

---

## 👤 Author

**Mohammed Aqib**

- GitHub: [@imaqib101](https://github.com/imaqib101)
- Location: Bengaluru, India
