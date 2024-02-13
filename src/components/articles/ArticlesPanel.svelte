<script lang="ts">
    import { onDestroy } from 'svelte';
    import { articlesStore } from '$lib/stores';
    import type { FeedWithUnreadStories, ArticleType as Article } from '$lib/types';
    import { isLoadingArticles } from '$lib/loadingState';

    export let selectedFeed: FeedWithUnreadStories;

    let articles: Article[] = [];
    let isVisible: boolean = false;
    let startX: number, startWidth: number;

    // When selectedFeed changes, automatically show the panel
    $: if (selectedFeed) {
        isVisible = true;
        // Optionally, reset articles array or perform other actions here
    }

    // Reactive subscription to articlesStore
    $: $articlesStore[selectedFeed?.id] ? articles = $articlesStore[selectedFeed.id] : articles = [];
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
</script>

<!-- <button on:click={toggleVisibility}>Toggle Panel</button> -->

{#if $isLoadingArticles}
    <div class="spinner" aria-label="Loading articles"></div>
{:else}
    <div class="articles-panel-wrapper" class:visible={isVisible}>
        <div class="resizer" on:mousedown={initDrag} role="button" tabindex="0"></div>
        {#if selectedFeed}
            <h3>{selectedFeed.feed_title}</h3>
            {#if articles.length > 0}
                <ul>
                    {#each articles as article (article.id)}
                        <li style="background-color: {article.feedColor};">
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
        width: calc(100vw / 2); /* Adjusted width to a third of the total view */
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
        left: -5px; /* Adjust if necessary to make the resizer more accessible */
        top: 0;
    }
    /* Keep existing styles */
</style>