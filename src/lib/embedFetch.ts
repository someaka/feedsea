import { embeddingsStore } from './stores/stores';
import type { ArticleType as Article, EmbeddingsCache } from '$lib/types';

const TIMEOUT_INTERVAL = 60 * 1000;
let idleTimeout: ReturnType<typeof setTimeout>;
let embedFetchWorker: Worker | null = null;

let workerInitializationPromise: Promise<Worker> | null = null;

async function initEmbedFetchWorker() {
    if (embedFetchWorker) {
        return embedFetchWorker;
    } else if (workerInitializationPromise) {
        // Wait for the ongoing initialization to complete
        return workerInitializationPromise;
    } else {
        // Start a new initialization
        workerInitializationPromise = (async () => {
            const EmbedFetchWorkerModule = await import('$lib/embedFetchWorker?worker');
            embedFetchWorker = new EmbedFetchWorkerModule.default();
            embedFetchWorker.onmessage = (event) => {
                const newEmbeddings: EmbeddingsCache = event.data;
                if (Object.keys(newEmbeddings).length > 0)
                    embeddingsStore.update((currentEmbeddings) => {
                        Object.assign(currentEmbeddings.embeddings, newEmbeddings);
                        currentEmbeddings.newEmbeddings = newEmbeddings;
                        return currentEmbeddings;
                    });
                // resetWorkerIdleTimeout();
            };
            embedFetchWorker.onerror = (error) => {
                console.error('EmbedFetch Worker error:', error);
            };
            return embedFetchWorker;
        })();
        const worker = await workerInitializationPromise;
        workerInitializationPromise = null; // Reset for future initializations
        return worker;
    }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    embedFetchWorker.postMessage(articles);
}

async function queueNewArticles(articles: Article[]) {
    await postMessageToEmbedFetchWorker(articles);
}

export default queueNewArticles;