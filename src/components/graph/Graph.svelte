<script lang="ts">
	import { onMount } from 'svelte';
	import { selectedFeedsStore } from '../stores/stores';
	import type { ArticleType as Article } from '$lib/types';

	let graphContainer;

	import { handleAddition, handleRemoval, handleNewArticles } from './graph';

	selectedFeedsStore.subscribe(({ feeds, change }) => {
		if (change) {
			if (change.type === 'new' && change.feedId && change.articles) {
				handleNewArticles(change.feedId, change.articles);
			} else if (change.type === 'add' && change.feedId && change.articles) {
				// Only process articles that are unprocessed or have embeddings but not all cosine similarities calculated
        // TODO
        // TODO articles to nodes and links stored
				(change.feedId, change.articles);
			} else if (change.type === 'remove' && change.feedId) {
				handleRemoval(change.feedId);
			}

		}
	});

</script>

<div bind:this={graphContainer} id="graph-container" style="width: 100%; height: 100%;"></div>

<style>
	/* #graph-container {
		width: 100%;
		height: 600px;
		background-color: #f0f0f0;
	} */
</style>
