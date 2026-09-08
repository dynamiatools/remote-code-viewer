<script setup>
import { goFile } from '../router.js';
import FileIcon from './FileIcon.vue';

const props = defineProps({
  dirPath: { type: String, required: true },
  nodes: { type: Object, required: true },
  expanded: { type: Object, required: true },
  toggle: { type: Function, required: true },
  childPath: { type: Function, required: true },
  active: { type: String, default: '' },
  depth: { type: Number, default: 0 },
});

function node() {
  return props.nodes.get(props.dirPath);
}
</script>

<template>
  <ul>
    <li v-for="entry in node()?.entries ?? []" :key="entry.name">
      <template v-if="entry.type === 'dir'">
        <button
          class="tap-target flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[var(--text-dim)] hover:bg-[var(--surface-dim)]"
          :style="{ paddingLeft: `${8 + depth * 14}px` }"
          @click="toggle(childPath(dirPath, entry.name))"
        >
          <span class="w-3 text-[var(--text-dim)]">{{ expanded.has(childPath(dirPath, entry.name)) ? '▾' : '▸' }}</span>
          <span class="truncate">{{ entry.name }}/</span>
        </button>
        <TreeLevel
          v-if="expanded.has(childPath(dirPath, entry.name))"
          :dir-path="childPath(dirPath, entry.name)"
          :nodes="nodes"
          :expanded="expanded"
          :toggle="toggle"
          :child-path="childPath"
          :active="active"
          :depth="depth + 1"
        />
      </template>
      <button
        v-else
        class="tap-target relative flex w-full items-center gap-1.5 rounded py-1 text-left hover:bg-[var(--surface-dim)]"
        :class="active === childPath(dirPath, entry.name)
          ? 'bg-[var(--color-accent)]/12 font-medium text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]'
          : 'text-[var(--text)]'"
        :style="{ paddingLeft: `${8 + (depth + 1) * 14}px` }"
        @click="goFile(childPath(dirPath, entry.name))"
      >
        <span
          v-if="active === childPath(dirPath, entry.name)"
          class="absolute left-0 top-0 h-full w-0.5 bg-[var(--color-accent)]"
        />
        <FileIcon :lang="entry.lang" />
        <span class="truncate">{{ entry.name }}</span>
      </button>
    </li>
    <li v-if="node()?.loading" class="px-3 py-1 text-[var(--text-dim)]" :style="{ paddingLeft: `${8 + depth * 14}px` }">…</li>
    <li v-if="node()?.truncated" class="px-3 py-1 text-xs text-[var(--text-dim)]" :style="{ paddingLeft: `${8 + depth * 14}px` }">truncated</li>
  </ul>
</template>
