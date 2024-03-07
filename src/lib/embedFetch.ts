import type { ArticleType as Article, EmbeddingsCache } from '$lib/types';
import { embeddingsStore } from './stores/stores';

let embedFetchWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

function initEmbedFetchWorker() {
    import('$lib/embedFetchWorker?worker').then(module => {
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
    });
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (embedFetchWorker) {
            embedFetchWorker.terminate();
            embedFetchWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

function postMessageToEmbedFetchWorker(articles: Article[]) {
    if (!embedFetchWorker) initEmbedFetchWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    embedFetchWorker?.postMessage(articles);
}


function queueNewArticles(articles: Article[]) {
    postMessageToEmbedFetchWorker(articles);
}

export { queueNewArticles, initEmbedFetchWorker };