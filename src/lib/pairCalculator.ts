import { get } from 'svelte/store';
import { embeddingsStore, pairsStore, articlesStore } from '../components/stores/stores';
import type { ArticleType as Article } from '$lib/types';

const queue: Record<string, number[]>[] = [];
let isProcessing = false;
let worker: Worker;

async function initWorker(): Promise<Worker> {
    const WorkerModule = await import('$lib/pairWorker?worker');
    return new WorkerModule.default();
}

async function initListeners() {

    worker = await initWorker();

    worker.onmessage = (event) => {
        const { newPairs } = event.data;
        pairsStore.update(currentPairs => {
            const updatedPairs = { ...currentPairs.pairs, ...newPairs };
            return { ...currentPairs, pairs: updatedPairs, newPairs };
        });
        isProcessing = false;
        processQueue();
    };

    worker.onerror = (error) => {
        console.error('Worker error:', error);
        isProcessing = false;
        processQueue();
    };

}

initListeners();


function addToQueue(embeddings: Record<string, number[]>) {
    queue.push(embeddings);
    if (!isProcessing) {
        processQueue();
    }
}

async function processQueue() {
    if (queue.length > 0 && !isProcessing) {
        isProcessing = true;
        const pairsState = get(pairsStore);
        const pairsStoreSnapshot = pairsState.pairs;
        const embeddings = queue.shift();
        worker.postMessage({ embeddings, pairsStoreSnapshot });
    }
}

async function calculateAllPairs() {
    const articleCache: Record<string, Article[]> = get(articlesStore);
    const embeddings = get(embeddingsStore);

    if (!articleCache || !embeddings) {
        console.error('Selected feeds or embeddings are not defined');
        return;
    }

    const allArticleIds = Object.values(articleCache).flat().map(article => article.id);

    const allEmbeddings = allArticleIds.reduce((acc, id) => {
        if (embeddings[id]) {
            acc[id] = embeddings[id];
        }
        return acc;
    }, {} as Record<string, number[]>);

    addToQueue(allEmbeddings);
}


export default calculateAllPairs