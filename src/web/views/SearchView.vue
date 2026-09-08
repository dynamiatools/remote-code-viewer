<script setup>
import { ref, watch } from 'vue';
import { api, ApiError } from '../api.js';
import { goFile } from '../router.js';

const q = ref('');
const kind = ref('text');
const results = ref([]);
const engine = ref(null);
const truncated = ref(false);
const error = ref(null);
const loading = ref(false);
let debounceTimer = null;

async function runSearch() {
  if (q.value.trim().length < 2) {
    results.value = [];
    error.value = null;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await api.search(q.value.trim(), { kind: kind.value });
    results.value = result.results;
    engine.value = result.engine;
    truncated.value = result.truncated;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'search failed';
  } finally {
    loading.value = false;
  }
}

watch([q, kind], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSearch, 200);
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center gap-2 border-b border-[var(--border)] p-3">
      <input
        v-model="q"
        type="search"
        placeholder="Search text or paths…"
        class="tap-target min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
        autofocus
      />
      <select
        v-model="kind"
        class="tap-target rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--color-accent)]"
      >
        <option value="text">Text</option>
        <option value="path">Path</option>
      </select>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
      <p v-if="loading" class="p-2 text-[var(--text-dim)]">searching…</p>
      <p v-else-if="error" class="p-2 text-[var(--color-del-dim)] dark:text-[var(--color-del)]">{{ error }}</p>
      <p v-else-if="!results.length && q.trim().length >= 2" class="p-2 text-[var(--text-dim)]">no results</p>

      <template v-else>
        <p v-if="engine" class="px-2 pb-1 text-xs text-[var(--text-dim)]">
          engine: {{ engine }}<span v-if="truncated"> · truncated</span>
        </p>
        <button
          v-for="(r, i) in results"
          :key="i"
          class="tap-target block w-full rounded px-2 py-1.5 text-left hover:bg-[var(--surface-dim)]"
          @click="goFile(r.path, r.line)"
        >
          <div class="truncate font-mono text-xs text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]">
            {{ r.path }}<span v-if="r.line" class="text-[var(--text-dim)]">:{{ r.line }}</span>
          </div>
          <div v-if="r.text !== undefined" class="truncate font-mono text-[var(--text)]">{{ r.text }}</div>
        </button>
      </template>
    </div>
  </div>
</template>
