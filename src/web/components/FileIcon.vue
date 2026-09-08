<script setup>
import { computed } from 'vue';
import { iconFor, iconKindFor } from '../langIcons.js';

const props = defineProps({
  name: { type: String, required: true },
  lang: { type: String, default: 'plaintext' },
});

// Hand-drawn badge glyphs for the types requested most often — a rounded
// square in the type's known color with a short mark, closer to how VS
// Code's own file icons read at a glance than a single generic shape tinted
// per language. Anything else falls back to the generic document glyph.
const BADGES = {
  js: { bg: '#f0db4f', fg: '#2b2b0a', label: 'JS', name: 'JavaScript' },
  ts: { bg: '#3178c6', fg: '#ffffff', label: 'TS', name: 'TypeScript' },
  html: { bg: '#e34c26', fg: '#ffffff', label: '</>', name: 'HTML' },
  css: { bg: '#2965f1', fg: '#ffffff', label: '#', name: 'CSS' },
  json: { bg: '#a3a325', fg: '#242400', label: '{}', name: 'JSON' },
  kotlin: { bg: '#7f52ff', fg: '#ffffff', label: 'K', name: 'Kotlin' },
  python: { bg: '#306998', fg: '#ffd43b', label: 'PY', name: 'Python' },
  xml: { bg: '#0b7285', fg: '#ffffff', label: '<>', name: 'XML' },
};

const kind = computed(() => iconKindFor(props.name));
const badge = computed(() => BADGES[kind.value]);
const generic = computed(() => iconFor(props.lang));
</script>

<template>
  <svg
    v-if="kind === 'markdown'"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Markdown</title>
    <rect x="0.5" y="2.5" width="15" height="11" rx="1.5" fill="#5a76b0" fill-opacity="0.18" stroke="#5a76b0" stroke-width="1.1" />
    <path d="M3 11V5H4.6L6.5 7.6L8.4 5H10V11H8.3V7.6L6.5 9.9L4.7 7.6V11H3Z" fill="#5a76b0" />
    <path d="M11.2 5V8.2H12.7L11 11L9.3 8.2H10.8V5H11.2Z" fill="#5a76b0" />
  </svg>

  <svg
    v-else-if="kind === 'vue'"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Vue</title>
    <path d="M1 2.5H4L8 9.3L12 2.5H15L8 14L1 2.5Z" fill="#41b883" />
    <path d="M4 2.5H6.3L8 5.4L9.7 2.5H12L8 9.3L4 2.5Z" fill="#35495e" />
  </svg>

  <svg
    v-else-if="kind === 'java'"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Java</title>
    <path d="M5 10.2C5 11.3 6.3 12.2 8 12.2C9.7 12.2 11 11.3 11 10.2" stroke="#e76f00" stroke-width="1.1" fill="none" stroke-linecap="round" />
    <ellipse cx="8" cy="10.3" rx="4.3" ry="1.6" fill="#e76f00" fill-opacity="0.22" stroke="#e76f00" stroke-width="1.1" />
    <path d="M7 2C8.5 3.2 6 4.2 7.3 5.6C8.2 6.5 6.5 7.4 6.5 7.4" stroke="#e76f00" stroke-width="1.1" fill="none" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="kind === 'gitignore'"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Git ignore rules</title>
    <circle cx="4.5" cy="4" r="1.6" fill="none" stroke="#e0973a" stroke-width="1.1" />
    <circle cx="4.5" cy="12" r="1.6" fill="none" stroke="#e0973a" stroke-width="1.1" />
    <circle cx="11.5" cy="8" r="1.6" fill="none" stroke="#e0973a" stroke-width="1.1" />
    <path d="M4.5 5.6V10.4M6 4.6L10 7.2" stroke="#e0973a" stroke-width="1.1" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="kind === 'agent'"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Agent instructions</title>
    <path
      d="M8 1.5L9.3 5.8L13.5 7L9.3 8.2L8 12.5L6.7 8.2L2.5 7L6.7 5.8L8 1.5Z"
      fill="var(--color-accent)"
      fill-opacity="0.85"
    />
    <path d="M12.7 10.5L13.2 12L14.7 12.5L13.2 13L12.7 14.5L12.2 13L10.7 12.5L12.2 12L12.7 10.5Z" fill="var(--color-accent)" />
  </svg>

  <svg
    v-else-if="badge"
    class="h-4 w-4 shrink-0"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{{ badge.name }}</title>
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" :fill="badge.bg" />
    <text
      x="8"
      y="8"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="badge.fg"
      font-size="6.5"
      font-weight="700"
      font-family="ui-monospace, monospace"
    >{{ badge.label }}</text>
  </svg>

  <svg v-else class="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <title>{{ generic.name }}</title>
    <path
      d="M4 1.5H8.5L12 5V13.5C12 14.0523 11.5523 14.5 11 14.5H4C3.44772 14.5 3 14.0523 3 13.5V2.5C3 1.94772 3.44772 1.5 4 1.5Z"
      :fill="generic.color"
      fill-opacity="0.16"
      :stroke="generic.color"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path d="M8.5 1.5V4.5C8.5 4.77614 8.72386 5 9 5H12" :stroke="generic.color" stroke-width="1.1" stroke-linejoin="round" />
  </svg>
</template>
