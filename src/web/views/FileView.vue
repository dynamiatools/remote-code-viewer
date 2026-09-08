<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { api, ApiError } from '../api.js';
import { route, goFile } from '../router.js';
import { highlight } from '../highlight.js';
import { renderMarkdown } from '../markdown.js';

defineProps({ limits: { type: Object, default: null } });

const file = ref(null);
const error = ref(null);
const tooLarge = ref(null);
const loading = ref(false);
const symbols = ref([]);
const codeLines = ref([]);
const outlineOpen = ref(false);

async function load() {
  error.value = null;
  tooLarge.value = null;
  file.value = null;
  symbols.value = [];
  codeLines.value = [];
  loading.value = true;
  try {
    const result = await api.file(route.path);
    file.value = result;
    if (!result.binary && result.lang !== 'markdown') {
      codeLines.value = await highlight(result.content, result.lang);
    }
    api.symbols(route.path).then((s) => { symbols.value = s.symbols; }).catch(() => {});
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) {
      tooLarge.value = err.body;
    } else {
      error.value = err instanceof ApiError ? err.message : 'failed to load the file';
    }
  } finally {
    loading.value = false;
    nextTick(scrollToLine);
  }
}

function scrollToLine() {
  if (!route.line) return;
  const el = document.getElementById(`L${route.line}`);
  el?.scrollIntoView({ block: 'center' });
}

const markdownHtml = computed(() => (file.value?.lang === 'markdown' && file.value.content ? renderMarkdown(file.value.content) : ''));

watch(() => route.path, load, { immediate: true });
watch(() => route.line, () => nextTick(scrollToLine));
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-1.5 text-xs dark:border-neutral-800">
      <span class="truncate font-mono">{{ file?.path ?? route.path }}</span>
      <button
        v-if="symbols.length"
        class="tap-target shrink-0 rounded px-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        @click="outlineOpen = !outlineOpen"
      >Outline</button>
    </div>

    <div v-if="outlineOpen && symbols.length" class="border-b border-neutral-200 bg-neutral-50 px-2 py-1 text-xs dark:border-neutral-800 dark:bg-neutral-950">
      <button
        v-for="s in symbols"
        :key="`${s.name}-${s.line}`"
        class="tap-target block w-full rounded px-2 py-0.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
        @click="goFile(route.path, s.line); outlineOpen = false"
      >
        <span class="text-neutral-400">{{ s.kind }}</span> {{ s.name }} <span class="text-neutral-400">:{{ s.line }}</span>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <p v-if="loading" class="p-4 text-neutral-400">loading…</p>
      <p v-else-if="error" class="p-4 text-red-600">{{ error }}</p>
      <div v-else-if="tooLarge" class="p-4 text-neutral-500">
        File too large to display ({{ tooLarge.size }} bytes, limit {{ limits?.maxFileSize }}).
      </div>
      <p v-else-if="file?.binary" class="p-4 text-neutral-500">Binary file, {{ file.size }} bytes.</p>
      <div v-else-if="file?.lang === 'markdown'" class="prose prose-neutral max-w-none p-4 dark:prose-invert" v-html="markdownHtml" />
      <table v-else-if="file" class="w-full border-collapse">
        <tbody>
          <tr v-for="(line, i) in codeLines" :id="`L${i + 1}`" :key="i" :class="{ 'bg-yellow-100 dark:bg-yellow-900/30': route.line === i + 1 }">
            <td class="select-none px-2 text-right align-top text-neutral-400 tabular-nums">{{ i + 1 }}</td>
            <td class="w-full pr-4"><pre class="code-block" v-html="line || '&nbsp;'" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
