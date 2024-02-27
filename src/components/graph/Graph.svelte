<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		newArticlesStore,
		pairsCalculationStore,
		nodesStoreUpdate,
		linksStoreUpdate,
		newNodesStore,
		newLinksStore,
		articlesWithNodesAndLinksStore
	} from '../../lib/stores/stores';
	import { theme } from '../../lib/stores/night';
	import { setContainer, updateDayNightMode } from './graphologySigma';

	let graphContainer: HTMLElement;
	onMount(() => {
		setContainer(graphContainer);
	});

	theme.subscribe((value) => {
		updateDayNightMode();
	});

	let newArticlesStatus;
	let pairsCalculationStatus;
	let nodes;
	let links;
	let newNodes;
	let newLinks;
	let articlesWithNodesAndLinks;

	// Subscribe to newArticlesStore
	const unsubscribeNewArticles = newArticlesStore.subscribe((value) => {
		newArticlesStatus = value;
	});

	// Subscribe to pairsCalculationStore
	const unsubscribePairsCalculation = pairsCalculationStore.subscribe((value) => {
		pairsCalculationStatus = value;
	});

	// Subscribe to nodesStore
	const unsubscribeNodes = nodesStoreUpdate.subscribe((value) => {
		nodes = value;
	});

	// Subscribe to linksStore
	const unsubscribeLinks = linksStoreUpdate.subscribe((value) => {
		links = value;
	});

	// Subscribe to newNodesAndLinksStore
	const unsubscribeNewNodes = newNodesStore.subscribe((value) => {
		newNodes = value;
	});

	// Subscribe to newNodesAndLinksStore
	const unsubscribeNewLinks = newLinksStore.subscribe((value) => {
		newLinks = value;
	});

	// Subscribe to articlesWithNodesAndLinksStore
	const unsubscribeArticlesWithNodesAndLinks = articlesWithNodesAndLinksStore.subscribe((value) => {
		articlesWithNodesAndLinks = value;
	});

	onDestroy(() => {
		unsubscribeNewArticles();
		unsubscribePairsCalculation();
		unsubscribeNodes();
		unsubscribeLinks();
		unsubscribeNewNodes();
		unsubscribeNewLinks();
		unsubscribeArticlesWithNodesAndLinks();
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
