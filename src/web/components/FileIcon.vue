<script setup>
import { computed } from 'vue';
import { iconFor } from '../langIcons.js';

const props = defineProps({ lang: { type: String, default: 'plaintext' } });

const icon = computed(() => iconFor(props.lang));
</script>

<template>
  <span
    class="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold leading-none tracking-tighter"
    :style="{ color: icon.color, backgroundColor: `${icon.color}22` }"
  >{{ icon.abbr }}</span>
</template>
