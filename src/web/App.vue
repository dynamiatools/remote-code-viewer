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
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-3 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <button
        class="tap-target -ml-1 grid place-items-center rounded-lg text-lg md:hidden"
        aria-label="Toggle file tree"
        @click="drawerOpen = !drawerOpen"
      >☰</button>
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">{{ meta?.workspace?.name ?? 'remote-code-viewer' }}</div>
        <div v-if="meta?.git?.isRepo" class="truncate text-xs text-neutral-500">{{ meta.git.branch ?? 'detached' }}</div>
      </div>
      <nav class="hidden items-center gap-1 md:flex">
        <button class="tap-target rounded-lg px-3 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900" @click="goSearch">Search</button>
        <button class="tap-target rounded-lg px-3 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900" @click="goGit">Git</button>
      </nav>
    </header>

    <div v-if="metaError" class="p-4 text-sm text-red-600">{{ metaError }}</div>

    <div v-else class="relative flex min-h-0 flex-1">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-20 bg-black/30 md:hidden"
        @click="drawerOpen = false"
      />
      <aside
        class="absolute inset-y-0 left-0 z-30 w-72 -translate-x-full overflow-y-auto border-r border-neutral-200 bg-neutral-50 transition-transform duration-150 md:static md:z-0 md:w-64 md:translate-x-0 dark:border-neutral-800 dark:bg-neutral-950"
        :class="{ 'translate-x-0': drawerOpen }"
      >
        <TreeView />
      </aside>

      <main class="min-w-0 flex-1 overflow-y-auto">
        <FileView v-if="route.view === 'file'" :limits="meta?.limits" />
        <SearchView v-else-if="route.view === 'search'" />
        <GitView v-else-if="route.view === 'git'" />
        <div v-else class="flex h-full items-center justify-center p-8 text-center text-neutral-400">
          <p>Pick a file from the tree.</p>
        </div>
      </main>
    </div>

    <nav class="flex border-t border-neutral-200 md:hidden dark:border-neutral-800">
      <button class="tap-target flex-1 py-2 text-sm" :class="{ 'font-semibold': route.view === 'tree' || route.view === 'file' }" @click="drawerOpen = true">Tree</button>
      <button class="tap-target flex-1 py-2 text-sm" :class="{ 'font-semibold': route.view === 'search' }" @click="goSearch">Search</button>
      <button class="tap-target flex-1 py-2 text-sm" :class="{ 'font-semibold': route.view === 'git' }" @click="goGit">Git</button>
    </nav>
  </div>
</template>
