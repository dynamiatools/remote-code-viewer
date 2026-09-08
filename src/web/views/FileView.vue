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
const imageDataUrl = computed(() => (file.value?.image ? `data:${file.value.mime};base64,${file.value.content}` : ''));

watch(() => route.path, load, { immediate: true });
watch(() => route.line, () => nextTick(scrollToLine));
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5 text-xs">
      <span class="truncate font-mono text-[var(--text-dim)]">{{ file?.path ?? route.path }}</span>
      <button
        v-if="symbols.length"
        class="tap-target shrink-0 rounded px-2 text-[var(--color-accent-dim)] hover:bg-[var(--surface-dim)] dark:text-[var(--color-accent)]"
        @click="outlineOpen = !outlineOpen"
      >Outline</button>
    </div>

    <div v-if="outlineOpen && symbols.length" class="border-b border-[var(--border)] bg-[var(--surface-dim)] px-2 py-1 text-xs">
      <button
        v-for="s in symbols"
        :key="`${s.name}-${s.line}`"
        class="tap-target block w-full rounded px-2 py-0.5 text-left hover:bg-[var(--surface)]"
        @click="goFile(route.path, s.line); outlineOpen = false"
      >
        <span class="text-[var(--text-dim)]">{{ s.kind }}</span> {{ s.name }} <span class="text-[var(--text-dim)]">:{{ s.line }}</span>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <p v-if="loading" class="p-4 text-[var(--text-dim)]">loading…</p>
      <p v-else-if="error" class="p-4 text-[var(--color-del-dim)] dark:text-[var(--color-del)]">{{ error }}</p>
      <div v-else-if="tooLarge" class="p-4 text-[var(--text-dim)]">
        File too large to display ({{ tooLarge.size }} bytes, limit {{ limits?.maxFileSize }}).
      </div>
      <div v-else-if="file?.image" class="flex justify-center p-4">
        <img :src="imageDataUrl" :alt="file.name" class="max-w-full rounded border border-[var(--border)]" />
      </div>
      <p v-else-if="file?.binary" class="p-4 text-[var(--text-dim)]">Binary file, {{ file.size }} bytes.</p>
      <div v-else-if="file?.lang === 'markdown'" class="markdown-body p-4" v-html="markdownHtml" />
      <table v-else-if="file" class="w-full border-collapse">
        <tbody>
          <tr
            v-for="(line, i) in codeLines"
            :id="`L${i + 1}`"
            :key="i"
            :class="route.line === i + 1 ? 'bg-[var(--color-accent)]/15' : ''"
          >
            <td class="select-none px-2 text-right align-top text-[var(--text-dim)] tabular-nums">{{ i + 1 }}</td>
            <td class="w-full pr-4"><pre class="code-block" v-html="line || '&nbsp;'" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
