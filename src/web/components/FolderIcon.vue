<script setup>
const props = defineProps({
  name: { type: String, default: '' },
  open: { type: Boolean, default: false },
});

const isAgentDir = props.name === '.claude';
</script>

<template>
  <svg v-if="isAgentDir" class="h-4 w-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <title>Agent workspace</title>
    <path
      v-if="open"
      d="M1.5 4C1.5 3.44772 1.94772 3 2.5 3H6L7.5 4.5H13.5C14.0523 4.5 14.5 4.94772 14.5 5.5V6H3.5L1.5 12V4Z"
      fill="var(--color-accent)"
      fill-opacity="0.22"
      stroke="var(--color-accent)"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path
      v-if="open"
      d="M1.5 12L3.2 6.6C3.33 6.24 3.67 6 4.05 6H14C14.35 6 14.6 6.34 14.49 6.67L12.9 11.67C12.79 12.02 12.46 12.25 12.09 12.25H2C1.72 12.25 1.52 11.99 1.5 12Z"
      fill="var(--color-accent)"
      fill-opacity="0.3"
      stroke="var(--color-accent)"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path
      v-else
      d="M1.5 3.5C1.5 2.94772 1.94772 2.5 2.5 2.5H6L7.5 4H13.5C14.0523 4 14.5 4.44772 14.5 5V11.5C14.5 12.0523 14.0523 12.5 13.5 12.5H2.5C1.94772 12.5 1.5 12.0523 1.5 11.5V3.5Z"
      fill="var(--color-accent)"
      fill-opacity="0.2"
      stroke="var(--color-accent)"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path d="M9.3 6.2L9.9 7.9L11.6 8.4L9.9 8.9L9.3 10.6L8.7 8.9L7 8.4L8.7 7.9L9.3 6.2Z" fill="var(--color-accent)" />
  </svg>

  <svg v-else class="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      v-if="open"
      d="M1.5 4C1.5 3.44772 1.94772 3 2.5 3H6L7.5 4.5H13.5C14.0523 4.5 14.5 4.94772 14.5 5.5V6H3.5L1.5 12V4Z"
      fill="currentColor"
      fill-opacity="0.18"
      stroke="currentColor"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path
      v-if="open"
      d="M1.5 12L3.2 6.6C3.33 6.24 3.67 6 4.05 6H14C14.35 6 14.6 6.34 14.49 6.67L12.9 11.67C12.79 12.02 12.46 12.25 12.09 12.25H2C1.72 12.25 1.52 11.99 1.5 12Z"
      fill="currentColor"
      fill-opacity="0.28"
      stroke="currentColor"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
    <path
      v-else
      d="M1.5 3.5C1.5 2.94772 1.94772 2.5 2.5 2.5H6L7.5 4H13.5C14.0523 4 14.5 4.44772 14.5 5V11.5C14.5 12.0523 14.0523 12.5 13.5 12.5H2.5C1.94772 12.5 1.5 12.0523 1.5 11.5V3.5Z"
      fill="currentColor"
      fill-opacity="0.16"
      stroke="currentColor"
      stroke-width="1.1"
      stroke-linejoin="round"
    />
  </svg>
</template>
