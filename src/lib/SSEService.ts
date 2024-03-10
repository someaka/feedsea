import { articlesStore, selectedFeedsStore } from './stores/stores';
import type { ArticleType } from './types';

let eventSource: EventSource | null = null;

const TIMEOUT_INTERVAL = 60 * 1000;
let idleTimeout: ReturnType<typeof setTimeout>;
let decompressionWorker: Worker | null = null;

let workerInitializationPromise: Promise<Worker> | null = null;

async function initDecompressionWorker(): Promise<Worker> {
    if (decompressionWorker) {
        return decompressionWorker;
    } else if (workerInitializationPromise) {
        // Wait for the ongoing initialization to complete
        return workerInitializationPromise;
    } else {
        // Start a new initialization
        workerInitializationPromise = (async () => {
            const DecompressionWorkerModules = await import('$lib/decompressionWorker?worker');
            decompressionWorker = new DecompressionWorkerModules.default();
            decompressionWorker.onmessage = (event) => {
                const articlesBatch: ArticleType[] = event.data;
                updateArticlesState(articlesBatch);
                // resetWorkerIdleTimeout();
            };
            decompressionWorker.onerror = (error) =>
                console.error('Decompression Worker error:', error);
            return decompressionWorker;
        })();
        const worker = await workerInitializationPromise;
        workerInitializationPromise = null; // Reset for future initializations
        return worker;
    }
}

function updateArticlesState(articlesBatch: ArticleType[]) {
    articlesStore.update(currentArticles => {
        articlesBatch.forEach(article => {
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
    decompressionWorker.postMessage(data);
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