<script lang="ts">
	import ForceLayoutSettings from './ForceLayoutSettings.svelte';
	import ForceAtlas2Settings from './ForceAtlas2Settings.svelte';
	import { switchLayout } from '../graph/graphologySigma';
	import { isForceAtlas } from '$lib/stores/forces';
</script>

<div class="force-panel">
	<h3>Force Settings</h3>

	<!-- <button on:click={switchLayout}>
		Switch to {$isForceAtlas ? 'ForceAtlas2' : 'ForceAtlas'}
	</button> -->

	<!-- {#if $isForceAtlas} -->
	{#if true}
		<ForceLayoutSettings />
	{:else}
		<ForceAtlas2Settings />
	{/if}
</div>

<style>
	.force-panel {
		overflow-y: auto;
	}
</style>
