// src/lib/articleCacheStore.ts
import { writable } from 'svelte/store';

export const articleCache = writable<Map<string, unknown[]>>(new Map());