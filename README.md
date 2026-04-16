# Vue Composable Toolkit ⚡

[![Vue.js](https://img.shields.io/badge/Vue.js-v3.3+-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tree Shakeable](https://img.shields.io/badge/Tree--Shakeable-Zero%20Bloat-22c55e?style=for-the-badge)](https://bundlephobia.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A high-performance, tree-shakeable collection of **Vue 3 Composables** designed for enterprise-grade web applications. Built with TypeScript strict mode, microtask scheduling, and zero third-party dependencies.

---

## ⚡ Composable Modules

| Composable | Category | Highlights |
| :--- | :--- | :--- |
| **`useDebounceFn`** | Reactivity & Timing | Debounced executions with immediate trigger and maxWait bounds. |
| **`useFormValidation`** | Form Orchestration | Field-level asynchronous validators, dirty checking, and reactive state schema. |
| **`useAsyncState`** | Data Fetching | Promise state wrapper with exponential retry backoff and AbortController integration. |
| **`useIntersectionObserver`** | DOM Performance | Lazy component hydration and viewport visibility tracking with scope cleanup. |
| **`useLocalStorage`** | Persistence | Deeply reactive state synchronization with Web Storage APIs. |

---

## 📦 Installation

```bash
# npm
npm install @aqib/vue-composable-toolkit

# pnpm
pnpm add @aqib/vue-composable-toolkit
```

---

## 🚀 Quick Usage

### 1. Form Validation with Async Rules
```typescript
import { useFormValidation } from "@aqib/vue-composable-toolkit";

const { values, errors, isValid, validateAll } = useFormValidation({
  username: {
    initial: "",
    rules: [
      (v) => (v.length >= 3 ? null : "Username must be at least 3 characters"),
      async (v) => ((await checkAvailability(v)) ? null : "Username is taken")
    ]
  }
});
```

### 2. Debounced Search Execution
```typescript
import { useDebounceFn } from "@aqib/vue-composable-toolkit";

const { run: onSearchInput, isPending } = useDebounceFn((query: string) => {
  fetchSearchResults(query);
}, 300);
```

---

## 🧪 Testing & Quality

Every composable is unit-tested using **Vitest** with 100% test branch coverage:

```bash
# Run unit tests
pnpm test

# Run coverage report
pnpm test:coverage
```

---

## 👤 Author

**Mohammed Aqib**
- GitHub: [@imaqib101](https://github.com/imaqib101)
- Location: Bengaluru, India
