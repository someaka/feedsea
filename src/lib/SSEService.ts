import { articlesStore, selectedFeedsStore } from './stores/stores';
import type { ArticleType } from './types';

let eventSource: EventSource | null = null;
let decompressionWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
let DecompressionWorkerModules: typeof import('./decompressionWorker?worker') | null = null;
const TIMEOUT_INTERVAL = 60 * 1000;

async function initDecompressionWorker(): Promise<Worker> {
    if (!decompressionWorker) {
        if (!DecompressionWorkerModules)
            DecompressionWorkerModules = await import('./decompressionWorker?worker')
        decompressionWorker = new DecompressionWorkerModules.default();
        decompressionWorker.onmessage = (event) => {
            const articlesBatch: ArticleType[] = event.data;
            updateArticlesState(articlesBatch);
            // resetWorkerIdleTimeout();
        };
        decompressionWorker.onerror = (error) =>
            console.error('Decompression Worker error:', error);
    }
    return decompressionWorker;
}

function updateArticlesState(articlesBatch: ArticleType[]) {
    articlesStore.update(currentArticles => {
        articlesBatch?.forEach(article => {
            if (!currentArticles[article.feedId])
                currentArticles[article.feedId] = [];
            currentArticles[article.feedId].push(article);
        });
        return currentArticles;
    });
    selectedFeedsStore.update(selectedFeedState => {
        selectedFeedState.change = {
            type: 'new',
            feedId: -1,
            articles: articlesBatch
        };
        return selectedFeedState;
    });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(terminateDecompressionWorker, TIMEOUT_INTERVAL);
}
function terminateDecompressionWorker() {
    if (decompressionWorker) {
        decompressionWorker.terminate();
        decompressionWorker = null;
    }
}

async function postMessageToDecompressionWorker(data: string) {
    decompressionWorker = await initDecompressionWorker();
    // clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    decompressionWorker?.postMessage(data);
}

export function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/events');
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