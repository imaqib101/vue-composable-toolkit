# Vue Composable Toolkit ⚡

[![Vue 3](https://img.shields.io/badge/Vue-3.4+-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tree-shakeable](https://img.shields.io/badge/ESM-Tree--shakeable-success?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A high-performance, tree-shakeable collection of **Enterprise Vue 3 Composables** written in strict TypeScript. Built for complex data-dense frontend applications requiring rock-solid reactivity, virtual scrolling, reactive form validation pipelines, and cross-tab storage synchronization.

---

## 📦 Composable Catalog

| Composable | Category | Description | Key Capabilities |
| :--- | :--- | :--- | :--- |
| `useAsyncRetry` | **Async & Resilience** | Async retry controller with backoff | Exponential/linear/fixed backoff, jitter, retryIf filter, abort handle |
| `useWebSocket` | **Realtime & Network** | Reactive WebSocket connection client | Auto-reconnect with backoff, heartbeat ping/pong, JSON auto-parse, scope cleanup |
| `useVirtualList` | **Performance** | High-density virtual scrolling window | Dynamic offsets, overscan buffers, programmatic `scrollToIndex` |
| `useFormValidation` | **State & Forms** | Reactive form validation pipeline | Field dirty/touched flags, async validators, debounced execution |
| `useLocalStorageState` | **State & Persistence** | Synchronized cross-tab storage | SSR-safe, custom (de)serialization, `StorageEvent` listeners |
| `useHistoryState` | **State & Time-Travel** | Undo/redo state history with bounded stack | Linear snapshots, canUndo/canRedo flags, commit & reset controls |
| `useNetworkStatus` | **Hardware & Web API** | Network connection & quality telemetry | Effective connection type (`4g`/`3g`), downlink, RTT, online/offline |
| `useIntersectionObserver` | **DOM & Visibility** | Viewport visibility tracker | Configurable thresholds, root margins, `freezeOnceVisible` |
| `useDebouncedRef` | **Timing Primitives** | Debounced reactive state | Immediate flush, pending state tracking, manual cancellation |
| `useThrottledRef` | **Timing Primitives** | Throttled reactive state | Configurable leading & trailing edge execution |

---

## 🚀 Usage Guide

### 1. `useVirtualList` — Virtual Scrolling for Massive Datasets
Render tens of thousands of items with zero frame drops:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useVirtualList } from "vue-composable-toolkit";

const items = ref(Array.from({ length: 50000 }, (_, i) => ({ id: i, name: `User #${i}` })));

const { virtualRows, totalHeight, offsetY, containerProps, wrapperProps, scrollToIndex } = useVirtualList({
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

const prefs = useLocalStorageState<UserPreferences>("app_prefs", {
  theme: "dark",
  fontSize: 14
}, { syncTabs: true });

// Mutating prefs automatically persists to localStorage and synchronizes across all open browser tabs!
prefs.value.theme = "light";
```

### Resilient Async Operations with Backoff (`useAsyncRetry`)

```vue
<script setup lang="ts">
import { useAsyncRetry } from "vue-composable-toolkit";

const { data, error, loading, isRetrying, retryCount, execute, abort } = useAsyncRetry(
  async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  {
    maxRetries: 3,
    delay: 1000,
    backoff: "exponential",
    retryIf: (err: any) => !err.message.includes("404"), // Don't retry non-existent orders
    onRetry: (attempt, err, delayMs) => {
      console.warn(`Retry attempt #${attempt} after ${delayMs}ms due to:`, err);
    },
  }
);
</script>

<template>
  <button :disabled="loading" @click="execute('ORD-1234')">Fetch Order</button>
  <span v-if="isRetrying">Retrying (attempt {{ retryCount }}/3)...</span>
  <div v-if="data">{{ data }}</div>
  <div v-if="error" class="error">{{ error.message }}</div>
</template>
```

---

### 5. `useDebouncedQuery` — Resilient Debounced Search with AbortSignal
Automatically debounces asynchronous query execution, automatically passes an `AbortSignal` to cancel stale in-flight requests, and provides reactive `data`, `loading`, `isPending`, and `error` states:

```typescript
import { ref } from "vue";
import { useDebouncedQuery } from "vue-composable-toolkit";

const searchInput = ref("");

const { data: searchResults, loading, isPending, error, execute, cancel } = useDebouncedQuery(
  async (query, signal) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
    return res.json();
  },
  searchInput,
  { debounceMs: 300, minQueryLength: 2, initialValue: [] }
);
```

---

### 6. `useWebSocket` — Reactive WebSocket Client with Heartbeat & Backoff
Zero-dependency, reactive WebSocket composable with automatic JSON serialization, exponential reconnection backoff, configurable heartbeat ping/pong keepalives, and automatic scope disposal:

```typescript
import { useWebSocket } from "vue-composable-toolkit";

const { data, status, send, close } = useWebSocket<{ price: number; symbol: string }>(
  "wss://stream.binance.com/ws/btcusdt",
  {
    autoReconnect: {
      retries: 5,
      delay: 1000,
      backoffMultiplier: 1.5,
    },
    heartbeat: {
      message: { ping: true },
      interval: 15000,
      pongTimeout: 5000,
    },
    onConnected: () => console.log("WebSocket connected"),
    onMessage: (ws, event, message) => {
      console.log(`Latest ticker: ${message.symbol} @ $${message.price}`);
    },
  }
);
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
