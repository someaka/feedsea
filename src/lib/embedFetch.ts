// embedFetch.ts
import type { ArticleType as Article, EmbeddingsCache } from '$lib/types';
import { embeddingsStore } from './stores/stores';

let embedFetchWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;
let embedFetchWorkerPromise: Promise<Worker> | null = null;

function initEmbedFetchWorker() {
    if (!embedFetchWorkerPromise) {
        embedFetchWorkerPromise = import('$lib/embedFetchWorker?worker').then(module => {
            embedFetchWorker = new module.default();
            embedFetchWorker.onmessage = (event) => {
                const newEmbeddings: EmbeddingsCache = event.data;
                embeddingsStore.update((currentEmbeddings) => {
                    Object.assign(currentEmbeddings.embeddings, newEmbeddings);
                    currentEmbeddings.newEmbeddings = newEmbeddings;
                    return currentEmbeddings;
                });
                resetWorkerIdleTimeout();
            };
            embedFetchWorker.onerror = (error) => {
                console.error('EmbedFetch Worker error:', error);
            };
            return embedFetchWorker;
        });
    }
    return embedFetchWorkerPromise;
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        terminateEmbedFetchWorker();
    }, TIMEOUT_INTERVAL);
}

function terminateEmbedFetchWorker() {
    if (embedFetchWorker) {
        embedFetchWorker.terminate();
        embedFetchWorker = null;
        embedFetchWorkerPromise = null;
    }
}

function postMessageToEmbedFetchWorker(articles: Article[]) {
    initEmbedFetchWorker().then(() => {
        clearTimeout(idleTimeout); // Clear the timeout when a new task starts
        embedFetchWorker?.postMessage(articles);
    });
}

function queueNewArticles(articles: Article[]) {
    postMessageToEmbedFetchWorker(articles);
}

export { queueNewArticles, initEmbedFetchWorker };