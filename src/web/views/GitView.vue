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

function diffLineClass(line) {
  if (line.startsWith('+++') || line.startsWith('---')) return '';
  if (line.startsWith('@@')) return 'diff-line--hunk';
  if (line.startsWith('+')) return 'diff-line--add';
  if (line.startsWith('-')) return 'diff-line--del';
  return '';
}

async function toggleDiff(path, staged) {
  if (diffs.value[path]) {
    delete diffs.value[path];
    return;
  }
  try {
    const result = await api.gitDiff(path, staged);
    diffs.value = { ...diffs.value, [path]: result.diff.split('\n') };
  } catch {
    diffs.value = { ...diffs.value, [path]: ['(failed to load diff)'] };
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="flex h-full flex-col">
    <p v-if="error" class="p-4 text-[var(--color-del-dim)] dark:text-[var(--color-del)]">{{ error }}</p>
    <p v-else-if="!isRepo" class="p-4 text-[var(--text-dim)]">Not a git repository.</p>

    <template v-else>
      <div v-if="branch" class="border-b border-[var(--border)] px-3 py-2 text-sm">
        <span class="inline-flex items-center gap-1.5 font-mono font-medium">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          {{ branch.branch ?? 'HEAD' }}
        </span>
        <span v-if="branch.detached" class="text-[var(--text-dim)]"> (detached)</span>
        <span v-if="branch.ahead" class="ml-2 text-[var(--color-add-dim)] dark:text-[var(--color-add)]">↑{{ branch.ahead }}</span>
        <span v-if="branch.behind" class="ml-2 text-[var(--color-del-dim)] dark:text-[var(--color-del)]">↓{{ branch.behind }}</span>
      </div>

      <div class="flex border-b border-[var(--border)] text-sm">
        <button
          class="tap-target flex-1 border-b-2 py-2"
          :class="tab === 'status' ? 'border-[var(--color-accent)] font-semibold' : 'border-transparent text-[var(--text-dim)]'"
          @click="tab = 'status'"
        >Changes</button>
        <button
          class="tap-target flex-1 border-b-2 py-2"
          :class="tab === 'commits' ? 'border-[var(--color-accent)] font-semibold' : 'border-transparent text-[var(--text-dim)]'"
          @click="tab = 'commits'"
        >Commits</button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        <template v-if="tab === 'status'">
          <p v-if="!status.length" class="p-2 text-[var(--text-dim)]">working tree clean</p>
          <div v-for="f in status" :key="f.path">
            <button class="tap-target flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--surface-dim)]" @click="toggleDiff(f.path, f.staged)">
              <span class="w-4 shrink-0 font-mono text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]">{{ f.index }}{{ f.worktree }}</span>
              <span class="truncate font-mono">{{ f.path }}</span>
            </button>
            <pre v-if="diffs[f.path]" class="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-dim)] py-2 text-xs leading-5"><code
              v-for="(line, i) in diffs[f.path]"
              :key="i"
              class="diff-line"
              :class="diffLineClass(line)"
            >{{ line }}</code></pre>
          </div>
        </template>

        <template v-else>
          <div v-for="c in commits" :key="c.hash" class="rounded px-2 py-1.5 hover:bg-[var(--surface-dim)]">
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-xs text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]">{{ c.short }}</span>
              <span class="truncate">{{ c.subject }}</span>
            </div>
            <div class="text-xs text-[var(--text-dim)]">{{ c.author }} · {{ c.relative }}</div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
