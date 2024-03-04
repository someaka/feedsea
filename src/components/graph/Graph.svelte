<script lang="ts">
	// import '$lib/stores/updates.ts';
	import { onMount, onDestroy } from 'svelte';

	import { theme } from '$lib/stores/night';
	import { setContainer, updateDayNightMode } from './SigmaGraphUpdate';
	
	let graphContainer: HTMLElement;
	onMount(() => {
		setContainer(graphContainer);
	});

	const unsubscribeDayNight = theme.subscribe((value) => {
		updateDayNightMode();
	});

	onDestroy(() => {
		unsubscribeDayNight();
	});
</script>

<div bind:this={graphContainer} id="graph-container" style="width:  100%; height:  100%;"></div>

<style>
	#graph-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		z-index: -1; /* Ensures it's below other content */
	}
</style>
