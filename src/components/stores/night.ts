import { get, writable } from 'svelte/store';

export const isNightMode = writable(false);

export const theme = writable('light');

export function applyTheme() {
    // console.log("Applying theme");
    if (typeof window !== 'undefined') {
        const themeValue = get(theme);
        document.documentElement.setAttribute('data-theme', themeValue);
        localStorage.setItem('user-theme', themeValue);
    }
}