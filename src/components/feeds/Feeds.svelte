<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { feedsStore, articlesStore, selectedFeedsStore } from '../stores/stores';
	import { fetchFeeds, selectFeed } from '$lib/api';
	import { startSSE, stopSSE } from '$lib/SSEService';
	import ArticlesPanel from '../articles/ArticlesPanel.svelte';
	import { isLoadingFeeds, isLoadingArticles } from '$lib/loadingState';

	import type { FeedChange, FeedWithUnreadStories, ArticleType as Article } from '$lib/types';

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
		let feedAdded = false;
		selectedFeedsStore.update(({ feeds }) => {
			const updatedFeeds = { ...feeds };
			let updatedChange: FeedChange;

			if (!feeds[feed.id]) {
				// Feed is being selected
				updatedFeeds[feed.id] = [];
				updatedChange = { type: 'add', feedId: feed.id, articles: [] };
				feedAdded = true;
			} else {
				// Feed is being deselected
				delete updatedFeeds[feed.id];
				updatedChange = { type: 'remove', feedId: feed.id };
				if (latestSelectedFeed && latestSelectedFeed.id === feed.id) {
					latestSelectedFeed = null;
				}
			}

			return { feeds: updatedFeeds, change: updatedChange };
		});

		if (feedAdded) {
			latestSelectedFeed = feed;
		}

		await sendSelectFeed(feed);
	}

	async function sendSelectFeed(feed: FeedWithUnreadStories) {
		if (!latestSelectedFeed || latestSelectedFeed.id !== feed.id) {
			// Only fetch articles if the feed is the latest selected feed
			return;
		}

		isLoadingArticles.set(true);
		let cachedArticles: Article[] = [];
		// Assume selectFeed function fetches articles and updates articlesStore
		await selectFeed(feed);

		articlesStore.subscribe(($articlesStore) => {
			cachedArticles = $articlesStore[feed.id] || [];
		})(); // Immediately invoke to unsubscribe

		selectedFeedsStore.update(({ feeds }) => {
			const updatedFeeds = { ...feeds, [feed.id]: cachedArticles };
			const updatedChange: FeedChange = {
				type: 'new',
				feedId: feed.id,
				articles: cachedArticles
			};

			return { feeds: updatedFeeds, change: updatedChange };
		});

		isLoadingArticles.set(false);
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
