import { get } from 'svelte/store';
import { embeddingsStore, pairsStore, selectedFeedsStore } from '../components/stores/stores';

const queue: Record<string, number[]>[] = [];
let isProcessing = false;

const Worker = await import('$lib/pairWorker?worker');
const worker = new Worker.default();

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

function addToQueue(embeddings: Record<string, number[]>) {
    queue.push(embeddings);
    if (!isProcessing) {
        processQueue();
    }
}

function processQueue() {
    if (queue.length > 0 && !isProcessing) {
        isProcessing = true;
        const pairsState = get(pairsStore);
        const pairsStoreSnapshot = pairsState.pairs;
        const embeddings = queue.shift();
        worker.postMessage({ embeddings, pairsStoreSnapshot });
    }
}

function calculateAllPairs() {
    const selectedFeeds = get(selectedFeedsStore);
    const embeddings = get(embeddingsStore);

    const allFeedArticleIds = Object.values(selectedFeeds.feeds).flat().map(article => article.id);
    const allArticleIds = Object.keys(embeddings).filter(id => allFeedArticleIds.includes(id));

    const allEmbeddings = allArticleIds.reduce((acc, id) => {
        acc[id] = embeddings[id];
        return acc;
    }, {} as Record<string, number[]>);

    addToQueue(allEmbeddings);
}


export default calculateAllPairs