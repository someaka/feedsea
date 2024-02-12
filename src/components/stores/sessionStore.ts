import { writable } from 'svelte/store';

const sessionCookie = writable<string | null>(null);

export default sessionCookie;