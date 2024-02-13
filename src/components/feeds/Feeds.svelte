<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { feedsStore, articlesStore } from '$lib/stores';
	import { fetchFeeds, selectFeed } from '$lib/api';
	import { startSSE, stopSSE } from '$lib/SSEService';
	import ArticlesPanel from '../articles/ArticlesPanel.svelte';
	import type { FeedWithUnreadStories, ArticleType as Article } from '$lib/types';
	import { isLoadingFeeds, isLoadingArticles } from '$lib/loadingState';

	let feeds: FeedWithUnreadStories[] = [];
	let selectedFeed: FeedWithUnreadStories | null = null;

	// Subscribe to feedsStore
	const unsubscribeFeeds = feedsStore.subscribe((value) => {
		feeds = Object.values(value);
		isLoadingFeeds.set(false);
	});

	onMount(async () => {
		isLoadingFeeds.set(true);
		await fetchFeeds();
		isLoadingFeeds.set(false);
		startSSE();
	});

	onDestroy(() => {
		unsubscribeFeeds();
		stopSSE();
	});

	async function sendSelectFeed(feed: FeedWithUnreadStories) {
		selectedFeed = feed;
		isLoadingArticles.set(true); // Start loading articles
		let cachedArticles: Article[] = [];
		const unsubscribe = articlesStore.subscribe(($articlesStore) => {
			cachedArticles = $articlesStore[feed.id];
		});
		unsubscribe(); // Immediately unsubscribe since we only need the current value

		if (cachedArticles && cachedArticles.length > 0) {
			console.log('Using cached articles for feed', feed.id);
			isLoadingArticles.set(false); // Stop loading articles
		} else {
			console.log('Fetching new articles for feed', feed.id);
			await selectFeed(feed); // This should trigger fetching and updating the articlesStore
			isLoadingArticles.set(false); // Stop loading articles
		}
	}
</script>

<div>
	<h1>Feeds</h1>
	{#if $isLoadingFeeds}
		<div class="spinner" aria-label="Loading feeds"></div>
	{:else}
		{#each feeds as feed}
			<button
				class="feed-item"
				on:click={() => sendSelectFeed(feed)}
				style="background-color: {feed.color};"
			>
				{feed.feed_title}
			</button>
		{/each}
	{/if}
</div>

{#if selectedFeed}
	{#if $isLoadingArticles}
		<div class="spinner" aria-label="Loading articles"></div>
	{:else}
		<ArticlesPanel {selectedFeed} />
	{/if}
{/if}

<style>
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

	.feed-item {
		display: block;
		cursor: pointer;
		padding: 10px;
		margin: 5px 0;
		border: none;
		background-color: #f0f0f0;
		transition: background-color 0.3s;
	}

	.feed-item:hover,
	.feed-item:active {
		background-color: #e2e2e2;
	}
</style>
