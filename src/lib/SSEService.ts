import { articlesStore, selectedFeedsStore } from './stores/stores';
import type { ArticleType, FeedChange } from './types';

let eventSource: EventSource | null = null;
let decompressionWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;

function initializeDecompressionWorker() {
    import('./decompressionWorker?worker').then(module => {
        decompressionWorker = new module.default();
        decompressionWorker.onmessage = (event) => {
            const articlesBatch: ArticleType[] = event.data;
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

            resetWorkerIdleTimeout();
        };
    });
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (decompressionWorker) {
            decompressionWorker.terminate();
            decompressionWorker = null;
        }
    }, 10000);
}

function postMessageToDecompressionWorker(data: string) {
    if (!decompressionWorker) {
        initializeDecompressionWorker();
    }
    decompressionWorker?.postMessage(data);
    resetWorkerIdleTimeout();
}

export function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/events');
    initializeDecompressionWorker();

    eventSource.addEventListener('articleFetched', (event) => {
        const { compressedArticles } = JSON.parse(event.data);
        postMessageToDecompressionWorker(compressedArticles);
    });
}

export function stopSSE() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    if (decompressionWorker) {
        decompressionWorker.terminate();
        decompressionWorker = null;
    }
}