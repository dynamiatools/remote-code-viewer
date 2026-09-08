<script setup>
import { goFile } from '../router.js';

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
          class="tap-target flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
          :style="{ paddingLeft: `${8 + depth * 14}px` }"
          @click="toggle(childPath(dirPath, entry.name))"
        >
          <span class="w-3 text-neutral-400">{{ expanded.has(childPath(dirPath, entry.name)) ? '▾' : '▸' }}</span>
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
        class="tap-target flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
        :class="{ 'bg-neutral-200 dark:bg-neutral-800': active === childPath(dirPath, entry.name) }"
        :style="{ paddingLeft: `${8 + (depth + 1) * 14}px` }"
        @click="goFile(childPath(dirPath, entry.name))"
      >
        <span class="w-3" />
        <span class="truncate">{{ entry.name }}</span>
      </button>
    </li>
    <li v-if="node()?.loading" class="px-3 py-1 text-neutral-400" :style="{ paddingLeft: `${8 + depth * 14}px` }">…</li>
    <li v-if="node()?.truncated" class="px-3 py-1 text-xs text-neutral-400" :style="{ paddingLeft: `${8 + depth * 14}px` }">truncated</li>
  </ul>
</template>
