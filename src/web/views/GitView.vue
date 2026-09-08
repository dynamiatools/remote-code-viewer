<script setup>
import { onMounted, ref } from 'vue';
import { api, ApiError } from '../api.js';

const tab = ref('status');
const branch = ref(null);
const commits = ref([]);
const status = ref([]);
const diffs = ref({});
const error = ref(null);
const isRepo = ref(true);

async function loadAll() {
  try {
    const [b, c, s] = await Promise.all([api.gitBranch(), api.gitCommits(30), api.gitStatus()]);
    isRepo.value = b.isRepo;
    branch.value = b;
    commits.value = c.commits ?? [];
    status.value = s.files ?? [];
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'failed to load git info';
  }
}

async function toggleDiff(path, staged) {
  if (diffs.value[path]) {
    delete diffs.value[path];
    return;
  }
  try {
    const result = await api.gitDiff(path, staged);
    diffs.value = { ...diffs.value, [path]: result.diff };
  } catch {
    diffs.value = { ...diffs.value, [path]: '(failed to load diff)' };
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="flex h-full flex-col">
    <p v-if="error" class="p-4 text-red-600">{{ error }}</p>
    <p v-else-if="!isRepo" class="p-4 text-neutral-500">Not a git repository.</p>

    <template v-else>
      <div v-if="branch" class="border-b border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
        <span class="font-mono">{{ branch.branch ?? 'HEAD' }}</span>
        <span v-if="branch.detached" class="text-neutral-400"> (detached)</span>
        <span v-if="branch.ahead" class="ml-2 text-neutral-500">↑{{ branch.ahead }}</span>
        <span v-if="branch.behind" class="ml-2 text-neutral-500">↓{{ branch.behind }}</span>
      </div>

      <div class="flex border-b border-neutral-200 text-sm dark:border-neutral-800">
        <button class="tap-target flex-1 py-2" :class="{ 'font-semibold': tab === 'status' }" @click="tab = 'status'">Changes</button>
        <button class="tap-target flex-1 py-2" :class="{ 'font-semibold': tab === 'commits' }" @click="tab = 'commits'">Commits</button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        <template v-if="tab === 'status'">
          <p v-if="!status.length" class="p-2 text-neutral-400">working tree clean</p>
          <div v-for="f in status" :key="f.path">
            <button class="tap-target flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900" @click="toggleDiff(f.path, f.staged)">
              <span class="w-4 shrink-0 font-mono text-neutral-500">{{ f.index }}{{ f.worktree }}</span>
              <span class="truncate font-mono">{{ f.path }}</span>
            </button>
            <pre v-if="diffs[f.path]" class="code-block overflow-x-auto rounded bg-neutral-100 p-2 dark:bg-neutral-900">{{ diffs[f.path] }}</pre>
          </div>
        </template>

        <template v-else>
          <div v-for="c in commits" :key="c.hash" class="rounded px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-xs text-neutral-500">{{ c.short }}</span>
              <span class="truncate">{{ c.subject }}</span>
            </div>
            <div class="text-xs text-neutral-400">{{ c.author }} · {{ c.relative }}</div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
