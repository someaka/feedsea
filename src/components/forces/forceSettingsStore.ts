import { writable } from 'svelte/store';
import type { GraphSettings } from '$lib/types';
import defaultGraphSettings from '../forces/defautGraphSettings';

export const forcePanelSettings = writable<GraphSettings>(defaultGraphSettings);