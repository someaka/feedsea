import { embeddingsStore } from './stores/stores';
import type { ArticleType as Article, EmbeddingsCache } from '$lib/types';

let embedFetchWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

async function initEmbedFetchWorker() {
    if (!embedFetchWorker) {
        const EmbedFetchWorkerModule = await import('$lib/embedFetchWorker?worker')
        embedFetchWorker = new EmbedFetchWorkerModule.default();
        embedFetchWorker.onmessage = (event) => {
            const newEmbeddings: EmbeddingsCache = event.data;
            if (Object.keys(newEmbeddings).length > 0)
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
    }
    return embedFetchWorker;
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(terminateEmbedFetchWorker, TIMEOUT_INTERVAL);
}

function terminateEmbedFetchWorker() {
    if (embedFetchWorker) {
        embedFetchWorker.terminate();
        embedFetchWorker = null;
    }
}

async function postMessageToEmbedFetchWorker(articles: Article[]) {
    embedFetchWorker = await initEmbedFetchWorker()
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    embedFetchWorker?.postMessage(articles);
}

async function queueNewArticles(articles: Article[]) {
    await postMessageToEmbedFetchWorker(articles);
}

export default queueNewArticles;