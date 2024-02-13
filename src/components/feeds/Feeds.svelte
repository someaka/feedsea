<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { feedsStore, articlesStore } from '$lib/stores';
	import { fetchFeeds, selectFeed } from '$lib/api';
	import { startSSE, stopSSE } from '$lib/SSEService';
	import ArticlesPanel from '../articles/ArticlesPanel.svelte';
	import type { FeedWithUnreadStories, ArticleType as Article } from '$lib/types';
	import { isLoadingFeeds, isLoadingArticles } from '$lib/loadingState';

	let feeds: FeedWithUnreadStories[] = [];
	let selectedFeeds: FeedWithUnreadStories[] = []; // Track selected feeds
	let latestSelectedFeed: FeedWithUnreadStories | null = null; // Track the latest selected feed

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

	async function handleFeedClick(feed: FeedWithUnreadStories) {
		const index = selectedFeeds.findIndex((f) => f.id === feed.id);
		if (index === -1) {
			selectedFeeds = [...selectedFeeds, feed];
			latestSelectedFeed = feed; // Update the latest selected feed
		} else {
			selectedFeeds = selectedFeeds.filter((f) => f.id !== feed.id);
			if (latestSelectedFeed && latestSelectedFeed.id === feed.id) {
				latestSelectedFeed = selectedFeeds[selectedFeeds.length - 1] || null;
			}
		}
		await sendSelectFeed(feed); // Call sendSelectFeed when a feed is clicked
	}

	async function sendSelectFeed(feed: FeedWithUnreadStories) {
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

	function isSelected(feed: FeedWithUnreadStories): boolean {
		return selectedFeeds.some((f) => f.id === feed.id);
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
				class:selected={selectedFeeds.some((f) => f.id === feed.id)}
				on:click={() => handleFeedClick(feed)}
				style="background-color: {feed.color};"
			>
				<div class="feed-item-content">{feed.feed_title}</div>
				<div class="unread-count">{feed.nt}</div>
			</button>
		{/each}
	{/if}
</div>

{#if latestSelectedFeed}
	{#if $isLoadingArticles}
		<div class="spinner" aria-label="Loading articles"></div>
	{:else}
		<ArticlesPanel {latestSelectedFeed} />
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
		width: 250px; /* Fixed width */
		text-align: left;
		transition:
			background-color 0.3s ease,
			box-shadow 0.3s ease;
		padding: 10px 15px;
		font-family: 'Roboto', sans-serif;
		font-size: 16px;
		color: #333;
		border: none;
		background-color: #fff;
		border-radius: 5px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		position: relative;
		overflow: hidden;
		margin-bottom: 5px; /* Space between items */
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.feed-item.selected {
		/* background-color: #102402d3 !important; */
		transform: translateX(-2px); /* Retract the button 2px to the left */
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); 

		/* border: 1px solid #d0d0d0; */
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease; /* Smooth transition for the transform and shadow */
	}

	.feed-item.selected::after {
		content: '';
		position: absolute;
		top: -1px; /* Adjust these values to match the border size */
		left: -1px;
		right: -1px;
		bottom: -1px;
		z-index: -1;
		/* background: linear-gradient(to right, rgba(208, 208, 208, 0.5), rgba(208, 208, 208, 0.5)); */
		border-radius: 3px; /* Match the border-radius of .feed-item if any */
	}

	.feed-item::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at left, rgba(255, 255, 255, 0.5), transparent);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.5s ease-in-out;
		z-index: 1; /* Adjusted to ensure visibility */
	}

	.feed-item:hover::after {
		opacity: 1; /* Show the hover effect */
	}

	.feed-item-content {
		z-index: 2; /* Ensure text is above the hover effect */
		position: relative; /* Required for z-index to take effect */
	}

	.unread-count {
		background-color: #817f7f6b; /* Example: red background for visibility */
		color: white;
		padding: 2px 5px;
		border-radius: 10px; /* Rounded corners for the unread count */
		font-size: 0.8em; /* Smaller font size for the count */
		margin-left: 10px; /* Space between the title and the count */
		z-index: 1; /* Ensure it's above the hover effect */
		position: relative; /* Required for z-index to take effect */
	}

	.feed-item:focus {
		outline: none;
		/* box-shadow: 0 0 0 1px rgba(0, 123, 255, 0.5); */
	}
</style>
