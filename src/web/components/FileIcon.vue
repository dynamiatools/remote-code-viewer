<script setup>
import { computed } from 'vue';
import { iconFor } from '../langIcons.js';

const props = defineProps({ lang: { type: String, default: 'plaintext' } });

const icon = computed(() => iconFor(props.lang));
</script>

<template>
  <svg
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :aria-label="icon.name"
  >
    <title>{{ icon.name }}</title>
    <path
      d="M4 1.5H8.5L12 5V13.5C12 14.0523 11.5523 14.5 11 14.5H4C3.44772 14.5 3 14.0523 3 13.5V2.5C3 1.94772 3.44772 1.5 4 1.5Z"
      :fill="icon.color"
      fill-opacity="0.16"
      :stroke="icon.color"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path d="M8.5 1.5V4.5C8.5 4.77614 8.72386 5 9 5H12" :stroke="icon.color" stroke-width="1.1" stroke-linejoin="round" />
  </svg>
</template>
