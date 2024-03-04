<script lang="ts">
	import { fly } from 'svelte/transition';
	import { isForceAtlas } from '$lib/stores/forces';
	import { switchLayout } from '../graph/SigmaGraphUpdate';
	import ForceLayoutSettings from './ForceLayoutSettings.svelte';
	import ForceAtlas2Settings from './ForceAtlas2Settings.svelte';

	const toggleForce = () => {
		switchLayout();
	};
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') toggleForce();
	};
	const flyParams = { x: -100, duration: 500 };
</script>

<div class="force-panel">
	<h3>
		<span
			class="force-clickable"
			tabindex="0"
			on:click={toggleForce}
			on:keydown={handleKeydown}
			role="button">Force Atlas</span
		>
		<div class="slide-container">
			{#if !$isForceAtlas}
				<span in:fly={flyParams} out:fly={flyParams}>2</span>
			{/if}
		</div>
	</h3>

	{#if $isForceAtlas}
		<ForceLayoutSettings />
	{:else}
		<ForceAtlas2Settings />
	{/if}
</div>

<style>
	.force-panel {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}
	.force-clickable {
		cursor: pointer;
		color: inherit;
		text-decoration: none;
		outline: none;
	}
	.slide-container {
		display: inline-flex;
		align-items: center;
	}
</style>
