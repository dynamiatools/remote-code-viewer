<script setup>
import { reactive, ref } from 'vue';
import { api, ApiError } from '../api.js';
import { route } from '../router.js';
import TreeLevel from '../components/TreeLevel.vue';

// One reactive node per loaded directory, keyed by its relative path ("" = root).
const nodes = reactive(new Map());
const error = ref(null);
const expanded = reactive(new Set(['']));

async function loadDir(dirPath) {
  if (nodes.has(dirPath)) return;
  nodes.set(dirPath, { entries: [], loading: true, truncated: false });
  try {
    const result = await api.tree(dirPath);
    nodes.set(dirPath, { entries: result.entries, loading: false, truncated: result.truncated });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'failed to load the tree';
    nodes.delete(dirPath);
  }
}

function toggle(dirPath) {
  if (expanded.has(dirPath)) {
    expanded.delete(dirPath);
  } else {
    expanded.add(dirPath);
    loadDir(dirPath);
  }
}

function childPath(dirPath, name) {
  return dirPath ? `${dirPath}/${name}` : name;
}

loadDir('');
</script>

<template>
  <div class="p-2 text-sm">
    <p v-if="error" class="p-2 text-red-600">{{ error }}</p>
    <TreeLevel
      dir-path=""
      :nodes="nodes"
      :expanded="expanded"
      :toggle="toggle"
      :child-path="childPath"
      :active="route.view === 'file' ? route.path : ''"
    />
  </div>
</template>
