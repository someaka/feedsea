<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, applyTheme } from '../components/stores/night';

	// On mount, set theme based on local storage or system preference
	onMount(() => {
		const storedTheme = localStorage.getItem('user-theme');
		if (storedTheme) {
			theme.set(storedTheme);
		} else {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			theme.set(prefersDark ? 'dark' : 'light');
		}
		applyTheme();
	});

	// Subscribe to the theme store and update the theme when it changes
	$: applyTheme();
</script>
