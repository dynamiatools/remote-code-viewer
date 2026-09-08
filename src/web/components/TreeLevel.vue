<script setup>
import { goFile } from '../router.js';
import FileIcon from './FileIcon.vue';
import FolderIcon from './FolderIcon.vue';

const props = defineProps({
  dirPath: { type: String, required: true },
  nodes: { type: Object, required: true },
  expanded: { type: Object, required: true },
  toggle: { type: Function, required: true },
  childPath: { type: Function, required: true },
  active: { type: String, default: '' },
  depth: { type: Number, default: 0 },
});

// Folder names that mark a source/convention root across common ecosystems
// (Maven/Gradle's src/main, src/test, npm/webpack's src, lib, components,
// public…). A visual cue, nothing more — never affects listing or access.
const CONVENTION_DIR_NAMES = new Set([
  'src', 'source', 'sources', 'main', 'lib', 'libs', 'components',
  'public', 'static', 'assets', 'resources', 'vendor',
]);

function node() {
  return props.nodes.get(props.dirPath);
}

function isConventionDir(name) {
  return CONVENTION_DIR_NAMES.has(name.toLowerCase());
}
</script>

<template>
  <ul>
    <li v-for="entry in node()?.entries ?? []" :key="entry.name">
      <template v-if="entry.type === 'dir'">
        <button
          class="tap-target flex w-max min-w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-[var(--surface-dim)]"
          :class="entry.ignored
            ? 'text-[var(--text-dim)] opacity-50 italic'
            : isConventionDir(entry.name)
              ? 'text-[var(--text-convention)]'
              : 'text-[var(--text-dim)]'"
          :style="{ paddingLeft: `${8 + depth * 14}px` }"
          @click="toggle(childPath(dirPath, entry.name))"
        >
          <span
            class="w-3 shrink-0 text-[10px] transition-transform"
            :class="{ 'rotate-90': expanded.has(childPath(dirPath, entry.name)) }"
          >▸</span>
          <FolderIcon :name="entry.name" :open="expanded.has(childPath(dirPath, entry.name))" />
          <span class="whitespace-nowrap">{{ entry.name }}</span>
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
        class="tap-target relative flex w-max min-w-full items-center gap-1.5 rounded py-1 text-left hover:bg-[var(--surface-dim)]"
        :class="active === childPath(dirPath, entry.name)
          ? 'bg-[var(--color-accent)]/12 font-medium text-[var(--color-accent-dim)] dark:text-[var(--color-accent)]'
          : entry.ignored ? 'text-[var(--text-dim)] opacity-50 italic' : 'text-[var(--text)]'"
        :style="{ paddingLeft: `${8 + (depth + 1) * 14}px` }"
        @click="goFile(childPath(dirPath, entry.name))"
      >
        <span
          v-if="active === childPath(dirPath, entry.name)"
          class="absolute left-0 top-0 h-full w-0.5 bg-[var(--color-accent)]"
        />
        <FileIcon :name="entry.name" :lang="entry.lang" />
        <span class="whitespace-nowrap">{{ entry.name }}</span>
      </button>
    </li>
    <li v-if="node()?.loading" class="px-3 py-1 text-[var(--text-dim)]" :style="{ paddingLeft: `${8 + depth * 14}px` }">…</li>
    <li v-if="node()?.truncated" class="whitespace-nowrap px-3 py-1 text-xs text-[var(--text-dim)]" :style="{ paddingLeft: `${8 + depth * 14}px` }">truncated</li>
  </ul>
</template>
