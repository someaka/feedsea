<script lang="ts">
    import type { Article } from '$lib/articles';
    export let articles: Article[] = [];
    export let isVisible: boolean = false;
</script>

<div class="articles-panel-wrapper" class:visible={isVisible}>
    <h3>Unread Articles</h3>
    <ul>
        {#each articles as article (article.id)}
            <li>{article.title}</li>
            <p>{article.url}</p>
            <p>{article.text}</p>
        {/each}
    </ul>
</div>

<style>
    .articles-panel-wrapper {
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        overflow-y: scroll;
        background-color: white;
        padding: 1rem;
        box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease-in-out;
        transform: translateX(100%); /* Initially hidden */
    }
    .articles-panel-wrapper.visible {
        transform: translateX(0); /* Make visible */
    }
</style>