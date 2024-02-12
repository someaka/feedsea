<script lang="ts">
	import axios from 'axios';
	import ArticlesPanel from '../articles/ArticlesPanel.svelte';
	import { articleCache } from '../../lib/articleCacheStore';
	import { onMount, onDestroy } from 'svelte';
	import { selectFeed as selectFeedAPI, setupSSE, cleanup } from '../../lib/articlesFromFeeds';

	import type { FeedWithUnreadStories } from '../../lib/feedTypes';
	import type { Article } from '../../lib/articles';

	let feeds: FeedWithUnreadStories;
	let isLoading = true;
	let selectedFeed: FeedWithUnreadStories;
	let articles: Article[];
	let listernersUp = false;

	onMount(async () => {
		try {
			const response = await axios.get('/feeds', { withCredentials: true });
			feeds = response.data;
		} catch (error) {
			console.error('Failed to fetch feeds:', error);
		} finally {
			isLoading = false;
		}
	});

	let cachedArticles: Article[];
	const unsubscribeFunction = articleCache.subscribe((cache) => {
		cachedArticles = cache.get(selectedFeed?.id.toString()) as Article[];
	});

	const selectFeed = async (feed: FeedWithUnreadStories) => {
		selectedFeed = feed;

		if (cachedArticles && cachedArticles.length > 0) {
			articles = cachedArticles;
		} else {
			articles = [];
			const queueResponse = await selectFeedAPI(feed);

			if (queueResponse.status === 200 && !listernersUp) {
				const addArticleAndUpdateCache = (article: Article) => {
					articles = [...articles, article];
					articleCache.update((cache) => {
						const currentArticles = cache.get(feed.id.toString()) || [];
						cache.set(feed.id.toString(), [...currentArticles, article]);
						return cache;
					});
				};
				const cleanupAndLogCompletion = () => {
					listernersUp = false;
					cleanup();
					console.log('Job complete');
				};
				setupSSE(addArticleAndUpdateCache, cleanupAndLogCompletion);
				listernersUp = true;
			}
		}
	};

	onDestroy(() => {
		unsubscribeFunction();
		cleanup();
	});
</script>

<div>
	<h1>Feeds</h1>
	{#if isLoading}
		<div class="spinner"></div>
	{:else}
		{#each Object.entries(feeds) as [id, feed]}
			<button class="feed-item" on:click|preventDefault={() => selectFeed(feed)}>
				<h2>{feed.feed_title}</h2>
			</button>
		{/each}
	{/if}
</div>

{#if selectedFeed}
	<ArticlesPanel isVisible={selectedFeed !== undefined} {articles} />
	{#each articles as article}
		<div class="article">
			<h3>{article.title}</h3>
			<p>{article.text}</p>
		</div>
	{/each}
{/if}

<style>
	.spinner {
		border: 4px solid rgba(0, 0, 0, 0.1);
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border-left-color: #09f;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.feed-item {
		cursor: pointer;
	}

	.article {
		margin-top: 10px;
	}

</style>
