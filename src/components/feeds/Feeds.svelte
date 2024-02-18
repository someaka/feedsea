<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
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

	function handleBeforeUnload() {
		unsubscribeFeeds();
		stopSSE();
		window.removeEventListener('beforeunload', handleBeforeUnload);
	}

	onMount(async () => {
		isLoadingFeeds.set(true);
		await fetchFeeds();
		isLoadingFeeds.set(false);
		startSSE();
		window.addEventListener('beforeunload', handleBeforeUnload);
	});

	// onDestroy(() => {
	// 	handleBeforeUnload();
	// });

	async function handleFeedClick(feed: FeedWithUnreadStories) {
		let feedAdded = false;
		selectedFeedsStore.update(({ feeds }) => {
			const updatedFeeds = { ...feeds };
			let updatedChange: FeedChange;

			if (!feeds[feed.id]) {
				// Feed is being selected
				updatedFeeds[feed.id] = get(articlesStore)[feed.id];
				updatedChange = { type: 'add', feedId: feed.id, articles: [] };
				feedAdded = true;
				selectedFeeds = [...selectedFeeds, feed];
			} else {
				// Feed is being deselected
				delete updatedFeeds[feed.id];
				updatedChange = { type: 'remove', feedId: feed.id };
				if (latestSelectedFeed && latestSelectedFeed.id === feed.id) {
					latestSelectedFeed = null;
				}
				selectedFeeds = selectedFeeds.filter((f) => f.id !== feed.id);
			}

			return { feeds: updatedFeeds, change: updatedChange };
		});

		if (feedAdded) {
			latestSelectedFeed = feed;
			// Check if the feed is already in the cache before sending the request
			const cachedArticles = get(articlesStore)[feed.id];
			if (!cachedArticles || cachedArticles.length === 0) {
				await selectFeed(feed);
			}
		}
	}

	let selectAll = true; // True means "Select All" is shown, false for "Unselect All"

	function toggleSelectAll() {
		if (selectAll) {
			// Logic to select all feeds
			feeds.forEach(async (feed) => {
				if (!selectedFeeds.some((f) => f.id === feed.id)) {
					await handleFeedClick(feed);
				}
			});
		} else {
			// Logic to unselect all feeds
			selectedFeeds.slice().forEach(async (feed) => {
				await handleFeedClick(feed);
			});
		}
		selectAll = !selectAll;
	}
</script>

<div class="feeds-wrapper">
	<div class="feeds-container {$isLoadingFeeds ? 'loading' : ''}">
		{#if $isLoadingFeeds}
			<h1>Feeds</h1>
			<div class="spinner" aria-label="Loading feeds"></div>
		{:else}
			<button
				class="feed-item"
				on:click={toggleSelectAll}
				style="color: #fff; padding: 9px 20px; margin-top: 7px; background-color: #9156f0;"
			>
				<div class="feed-item-content">{selectAll ? 'Select All' : 'Unselect All'}</div>
			</button>

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
		/* margin: auto; */
		margin-left: 10px;
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

	.feeds-wrapper {
		display: inline-block; /* Or width: fit-content; */
		max-height: 100vh;
		overflow: hidden; /* Prevents the wrapper from expanding beyond the width of its content */
	}

	.feeds-container {
		overflow-y: auto;
		overflow-x: hidden; /* Prevent horizontal scrolling */
		max-height: 100vh;
	}

	.feeds-container.loading {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.feeds-container::-webkit-scrollbar {
		width: 4px; /* Make the scrollbar thinner */
	}

	.feeds-container::-webkit-scrollbar-track {
		background: transparent; /* Make the track transparent */
	}

	.feeds-container::-webkit-scrollbar-thumb {
		background: transparent; /* Make the thumb transparent by default */
	}

	.feeds-container:hover::-webkit-scrollbar-thumb {
		background: rgba(136, 136, 136, 0.5); /* Show the thumb on hover with transparency */
	}

	.feeds-container::-webkit-scrollbar-thumb:hover {
		background: rgba(85, 85, 85, 0.5); /* Darker color on thumb hover */
	}
</style>
