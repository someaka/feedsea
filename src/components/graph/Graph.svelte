<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { selectedFeedsStore } from '../stores/stores';
	import { prepareGraphData } from './articleProcessor';
	import type { ArticleType as Article, GraphData } from '$lib/types';

	let graphContainer;

	import { handleAddition, handleRemoval, handleNewArticles } from './graph';

	// let unsubscribe: () => void;

	// onMount(() => {
	// 	unsubscribe = selectedFeedsStore.subscribe(({ feeds, change }) => {
	// 		if (change) {
	// 			switch (change.type) {
	// 				case 'new':
	// 					if (change.feedId && change.articles) {
	// 						handleNewArticles(change.feedId, change.articles);
	// 					}
	// 					break;
	// 				case 'add':
	// 					if (change.feedId && change.articles) {
	// 						const graphData: GraphData = prepareGraphData(change.articles);
	// 						handleAddition(graphData);
	// 					}
	// 					break;
	// 				case 'remove':
	// 					if (change.feedId) {
	// 						handleRemoval(change.feedId);
	// 					}
	// 					break;
	// 			}
	// 		}
	// 	});
	// });

	// onDestroy(() => {
	// 	if (unsubscribe) {
	// 		unsubscribe();
	// 	}
	// });
</script>

<div bind:this={graphContainer} id="graph-container" style="width:  100%; height:  100%;"></div>

<style>
</style>
