<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		newArticlesStore,
		pairsCalculationStore,
		nodesStore,
		linksStore,
		articlesWithNodesAndLinksStore
	} from '../stores/stores';
	import { setContainer } from './graphologySigma';

	let graphContainer: HTMLElement;
	onMount(() => {
		setContainer(graphContainer);
	});


	let newArticlesStatus;
	let pairsCalculationStatus;
	let nodes;
	let links;
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
	const unsubscribeNodes = nodesStore.subscribe((value) => {
		nodes = value;
	});

	// Subscribe to linksStore
	const unsubscribeLinks = linksStore.subscribe((value) => {
		links = value;
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
		unsubscribeArticlesWithNodesAndLinks();
	});
</script>

<div bind:this={graphContainer} id="graph-container" style="width:  100%; height:  100%;"></div>

<style>
</style>
