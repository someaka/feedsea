<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import {
		feedsStore,
		articlesStore,
		selectedFeedsStore,
		focusedArticleId
	} from '../../lib/stores/stores';
	import { fetchFeeds, selectFeed } from '$lib/api';
	import { startSSE, stopSSE } from '$lib/SSEService';
	import ArticlesPanel from '../articles/ArticlesPanel.svelte';
	import { isLoadingFeeds, isLoadingArticles } from '$lib/loadingState';

	import type { FeedChange, FeedWithUnreadStories, ArticleType as Article } from '$lib/types';
	import { clearGraph } from '../graph/graphologySigma';
	import { theme } from '$lib/stores/night';

	let feeds: FeedWithUnreadStories[] = [];
	let selectedFeeds: FeedWithUnreadStories[] = []; // Track selected feeds
	let latestSelectedFeed: FeedWithUnreadStories | null = null;

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

	onDestroy(() => {
		unsubscribe(); // Clean up the subscription
		isLoadingArticles.set(false); // Ensure loading state is reset when component is destroyed
		handleBeforeUnload();
	});

	let unsubscribe = focusedArticleId.subscribe((id) => {
		if (id) {
			pointArticleFromNode(id);
		}
	});

	async function pointArticleFromNode(nodeId: string) {
		const allArticles = get(articlesStore);

		// Use find to directly get the feedId
		const foundEntry = Object.entries(allArticles).find(([_, articles]) =>
			articles.some((article) => article.id === nodeId)
		);

		if (foundEntry) {
			const [foundFeedId] = foundEntry;
			latestSelectedFeed = get(feedsStore)[foundFeedId];

			await tick(); // Wait for the DOM to update after displaying the feed

			scrollToArticle(nodeId);
		}
	}

	function scrollToArticle(nodeId: string) {
		const articleElement = document.querySelector(`[data-article-id="${nodeId}"]`);
		if (articleElement) {
			articleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	async function handleFeedClick(feed: FeedWithUnreadStories) {
		selectedFeedsStore.update(({ feedIds }) => {
			const updatedFeedIds = feedIds;
			let updatedChange: FeedChange;

			if (!feedIds.has(feed.id)) {
				// Feed is being selected
				const allArticles = get(articlesStore);
				const cachedFeed = Object.keys(allArticles).includes(feed.id.toString());
				if (!cachedFeed) {
					articlesStore.update((articles) => {
						articles[feed.id] = [];
						return articles;
					});
					selectFeed(feed);
				}
				updatedFeedIds.add(feed.id);
				updatedChange = { type: 'add', feedId: feed.id, articles: [] };
				latestSelectedFeed = feed;
				selectedFeeds = [...selectedFeeds, feed];
			} else {
				// Feed is being deselected
				updatedFeedIds.delete(feed.id);
				updatedChange = { type: 'remove', feedId: feed.id };
				if (latestSelectedFeed && latestSelectedFeed.id === feed.id) {
					latestSelectedFeed = null;
				}
				selectedFeeds = selectedFeeds.filter((f) => f.id !== feed.id);
			}

			return { feedIds: updatedFeedIds, change: updatedChange };
		});
	}

	let selectAll = true; // True means "Select All" is shown, false for "Unselect All"

	function toggleSelectAll() {
		latestSelectedFeed = null;
		if (selectAll) selectAllFeeds();
		else unselectAllFeeds();
		selectAll = !selectAll;
	}

	function selectAllFeeds() {
		const fullFeedStore = get(feedsStore);
		const articleStoreSnapshot = get(articlesStore);
		const cachedFeeds = Object.keys(articleStoreSnapshot);
		const allFeedIds = Object.keys(fullFeedStore).map((id) => parseInt(id));
		const allFeeds = Object.values(fullFeedStore);
		const feedsToSelect = allFeeds.filter((feed) => !cachedFeeds.includes(feed.id.toString()));

		articlesStore.update((articles) => {
			feedsToSelect.forEach((feed) => {
				articles[feed.id] = [];
			});
			return articles;
		});

		feedsToSelect.forEach((feedId) => selectFeed(feedId));
		selectedFeedsStore.update(({ feedIds }) => {
			const feedIdsSet = new Set(allFeedIds.filter((id) => !feedIds.has(id)));
			const articlesToAdd = Array.from(feedIdsSet).flatMap(
				(feedId) => articleStoreSnapshot[feedId] || []
			);

			return {
				feedIds: new Set(allFeedIds),
				change: { type: 'all', feedId: -1, articles: articlesToAdd } as FeedChange
			};
		});

		selectedFeeds = allFeeds;
	}

	function unselectAllFeeds() {
		selectedFeedsStore.update(() => ({ feedIds: new Set() }));
		selectedFeeds = [];
		clearGraph();
	}
</script>

<div class="feeds-wrapper">
	<div class="feeds-container {$isLoadingFeeds ? 'loading' : ''}" class:dark={$theme === 'dark'}>
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
	.dark h1 {
		color: white;
	}

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
