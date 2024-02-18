<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { articlesStore, feedsStore } from '../stores/stores';
	import { theme } from '../stores/night';
	import { isLoadingArticles } from '$lib/loadingState';

	import type { FeedWithUnreadStories, ArticleType as Article } from '$lib/types';

	import DayNightModeButton from '../daynight/DayNightModeButton.svelte';
	import ForcesButton from '../forces/ForcesButton.svelte';
	import ForcePanel from '../forces/ForcePanel.svelte';

	let showForcePanel = false;

	function toggleForcePanel() {
		showForcePanel = !showForcePanel;
	}
	export let latestSelectedFeed: FeedWithUnreadStories;

	let articles: Article[] = [];
	let isVisible: boolean = false;
	let startX: number, startWidth: number;

	// When selectedFeed changes, automatically show the panel
	$: if (latestSelectedFeed) {
		isVisible = true;
		// Optionally, reset articles array or perform other actions here
	}

	// Reactive subscription to articlesStore
	$: $articlesStore[latestSelectedFeed?.id]
		? (articles = $articlesStore[latestSelectedFeed.id])
		: (articles = []);
	$: if (articles.length > 0) isLoadingArticles.set(false); // Stop loading when the first article appears

	function initDrag(e: MouseEvent) {
		startX = e.clientX;
		const htmlElement = document.querySelector('.articles-panel-wrapper') as HTMLElement;
		startWidth = htmlElement.offsetWidth;
		document.documentElement.addEventListener('mousemove', doDrag, false);
		document.documentElement.addEventListener('mouseup', stopDrag, false);
	}

	function doDrag(e: MouseEvent) {
		const newWidth = startWidth + (startX - e.clientX);
		const htmlElement = document.querySelector('.articles-panel-wrapper') as HTMLElement;
		htmlElement.style.width = `${newWidth}px`;
	}

	function stopDrag() {
		document.documentElement.removeEventListener('mousemove', doDrag, false);
		document.documentElement.removeEventListener('mouseup', stopDrag, false);
	}

	onDestroy(() => {
		isLoadingArticles.set(false); // Ensure loading state is reset when component is destroyed
	});

	let articlesPanelWrapper: HTMLElement;

	// Reactive statement to update the height of the resize bar
	$: if (articlesPanelWrapper) {
		const resizer = articlesPanelWrapper.querySelector('.resizer') as HTMLElement;
		if (resizer) {
			resizer.style.height = `${articlesPanelWrapper.scrollHeight}px`;
		}
	}
</script>

<!-- <button on:click={toggleVisibility}>Toggle Panel</button> -->

{#if $isLoadingArticles}
	<div class="spinner" aria-label="Loading articles"></div>
{:else}
	<div
		class:dark={$theme === 'dark'}
		class="articles-panel-wrapper"
		class:visible={isVisible}
		bind:this={articlesPanelWrapper}
	>
		<div class="resizer" on:mousedown={initDrag} role="button" tabindex="0"></div>
		<div class="buttons-container">
			<DayNightModeButton />
			<ForcesButton on:toggleForcePanel={toggleForcePanel} />
		</div>
		{#if showForcePanel}
			<ForcePanel />
		{:else if latestSelectedFeed}
			<h3>{latestSelectedFeed.feed_title}</h3>
			{#if articles.length > 0}
				<ul>
					{#each articles as article (article.id)}
						<li data-article-id={article.id} style="background-color: {article.feedColor};">
							<h4>{article.title}</h4>
							<a href={article.url} target="_blank">{article.url}</a>
							<p>{article.text}</p>
						</li>
					{/each}
				</ul>
			{:else}
				<p>Loading...</p>
			{/if}
		{:else}
			<p>Please select a feed to view articles.</p>
		{/if}
	</div>
{/if}

<style>
	.articles-panel-wrapper {
		position: fixed;
		top: 0;
		right: 0;
		width: calc(100vw / 4);
		height: 100%;
		overflow-y: scroll;
		background-color: white;
		padding: 1rem;
		box-shadow: -1px 0 2px rgba(0, 0, 0, 0.1);
		transition: transform 0.3s ease-in-out;
		transform: translateX(100%); /* Initially hidden */
	}
	.articles-panel-wrapper.visible {
		transform: translateX(0); /* Make visible */
	}
	.spinner {
		border: 4px solid rgba(0, 0, 0, 0.1);
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border-left-color: #09f;
		animation: spin 1s linear infinite;
		margin: auto;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.resizer {
		width: 7px;
		height: 100%;
		background: #ccc;
		cursor: ew-resize;
		position: absolute;
		left: -5px;
		top: 0;
	}

	.buttons-container {
		display: flex;
		justify-content: flex-end;
		position: absolute;
		top: 10px;
		right: 10px;
	}

	.buttons-container :global(button) {
		margin-left: 10px; /* Adds margin to the left of each button */
		flex: 0 0 auto; /* Prevents the buttons from growing or shrinking */
	}

	.buttons-container :global(button:first-child) {
		margin-left: 0; /* Removes left margin from the first button */
	}

	/* Dark mode styles */
	.dark {
		background-color: #222;
		color: #fff; /* Light text color */
		transition:
			background-color 0.1s ease-in-out,
			color 0.1s ease-in-out;
	}

	/* Ensure article content does not change in dark mode */
	.dark li {
		background-color: initial;
		color: initial;
	}

	.dark .resizer {
		background: #1b1a1a;
	}

	ul {
		list-style-type: none; /* Removes the default bullet points */
		padding-left: 0; /* Removes padding */
		margin-left: 10px;
	}
	li {
		margin-bottom: 1rem;
	}
</style>
