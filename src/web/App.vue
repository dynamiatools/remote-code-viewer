<script setup>
import { onMounted, ref, watch } from 'vue';
import { api, ApiError } from './api.js';
import { route, goSearch, goGit } from './router.js';
import TreeView from './views/TreeView.vue';
import FileView from './views/FileView.vue';
import SearchView from './views/SearchView.vue';
import GitView from './views/GitView.vue';

const meta = ref(null);
const metaError = ref(null);
const drawerOpen = ref(false);

onMounted(async () => {
  try {
    meta.value = await api.meta();
  } catch (err) {
    metaError.value = err instanceof ApiError ? err.message : 'could not reach the server';
  }
});

watch(() => route.view, () => {
  drawerOpen.value = false;
});
</script>

<template>
  <div class="flex h-full flex-col bg-[var(--bg)] text-[var(--text)]">
    <header class="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <button
        class="tap-target -ml-1 grid place-items-center rounded-lg text-lg text-[var(--text-dim)] md:hidden"
        aria-label="Toggle file tree"
        @click="drawerOpen = !drawerOpen"
      >☰</button>
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">{{ meta?.workspace?.name ?? 'remote-code-viewer' }}</div>
        <div v-if="meta?.git?.isRepo" class="mt-0.5 inline-flex items-center gap-1 truncate rounded-full bg-[var(--color-accent)]/12 px-2 py-0.5 text-xs font-medium text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          {{ meta.git.branch ?? 'detached' }}
        </div>
      </div>
      <nav class="hidden items-center gap-1 md:flex">
        <button
          class="tap-target rounded-lg px-3 text-sm transition-colors hover:bg-[var(--surface-dim)]"
          :class="route.view === 'search' ? 'text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]' : 'text-[var(--text-dim)]'"
          @click="goSearch"
        >Search</button>
        <button
          class="tap-target rounded-lg px-3 text-sm transition-colors hover:bg-[var(--surface-dim)]"
          :class="route.view === 'git' ? 'text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]' : 'text-[var(--text-dim)]'"
          @click="goGit"
        >Git</button>
      </nav>
    </header>

    <div v-if="metaError" class="p-4 text-sm text-[var(--color-del-dim)] dark:text-[var(--color-del)]">{{ metaError }}</div>

    <div v-else class="relative flex min-h-0 flex-1">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-20 bg-black/30 md:hidden"
        @click="drawerOpen = false"
      />
      <aside
        class="absolute inset-y-0 left-0 z-30 w-72 -translate-x-full overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] shadow-xl transition-transform duration-150 md:static md:z-0 md:w-64 md:translate-x-0 md:shadow-none"
        :class="{ 'translate-x-0': drawerOpen }"
      >
        <TreeView />
      </aside>

      <main class="min-w-0 flex-1 overflow-y-auto">
        <FileView v-if="route.view === 'file'" :limits="meta?.limits" />
        <SearchView v-else-if="route.view === 'search'" />
        <GitView v-else-if="route.view === 'git'" />
        <div v-else class="flex h-full items-center justify-center p-8 text-center text-[var(--text-dim)]">
          <p>Pick a file from the tree.</p>
        </div>
      </main>
    </div>

    <nav class="flex border-t border-[var(--border)] bg-[var(--surface)] md:hidden">
      <button
        class="tap-target flex-1 border-t-2 py-2 text-sm"
        :class="route.view === 'tree' || route.view === 'file' ? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]' : 'border-transparent text-[var(--text-dim)]'"
        @click="drawerOpen = true"
      >Tree</button>
      <button
        class="tap-target flex-1 border-t-2 py-2 text-sm"
        :class="route.view === 'search' ? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]' : 'border-transparent text-[var(--text-dim)]'"
        @click="goSearch"
      >Search</button>
      <button
        class="tap-target flex-1 border-t-2 py-2 text-sm"
        :class="route.view === 'git' ? 'border-[var(--color-accent)] font-semibold text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]' : 'border-transparent text-[var(--text-dim)]'"
        @click="goGit"
      >Git</button>
    </nav>
  </div>
</template>
