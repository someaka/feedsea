import { articlesStore, selectedFeedsStore } from './stores/stores';
import type { ArticleType, FeedChange } from './types';

let eventSource: EventSource | null = null;
let decompressionWorker: Worker;

export function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/events');

    // Initialize the decompression worker
    if (!decompressionWorker) {
        const DecompressionWorkerModule = import('./decompressionWorker?worker');
        DecompressionWorkerModule.then(module => {
            decompressionWorker = new module.default();
            decompressionWorker.onmessage = (event) => {
                const articlesBatch: ArticleType[] = event.data;

                // Update articlesStore and selectedFeedsStore with decompressed articles
                articlesStore.update((currentArticles) => {
                    articlesBatch.forEach(article => {
                        if (!currentArticles[article.feedId]) currentArticles[article.feedId] = [];
                        currentArticles[article.feedId].push(article);
                    });
                    return currentArticles;
                });

                selectedFeedsStore.update(({ feedIds }) => {
                    return {
                        feedIds: feedIds,
                        change: {
                            type: 'new',
                            feedId: -1,
                            articles: articlesBatch
                        } as FeedChange
                    };
                });
            };
        });
    }

    eventSource.addEventListener('articleFetched', (event) => {
        const { compressedArticles } = JSON.parse(event.data);
        // Send compressedArticles to the decompression worker
        decompressionWorker.postMessage(compressedArticles);
    });
}

export function stopSSE() {
    if (eventSource) eventSource.close();
    if (decompressionWorker) decompressionWorker.terminate();
}