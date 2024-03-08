import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let pairWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

async function initPairWorker(): Promise<Worker> {
    if (!pairWorker) {
        const pairWorkerModule = await import('$lib/pairWorker?worker')
        pairWorker = new pairWorkerModule.default();
        pairWorker.onmessage = (event) => {
            const newPairs = event.data;
            if (Object.values(newPairs).length > 0)
                pairsStore.update(currentPairs => {
                    Object.assign(currentPairs.pairs, newPairs);
                    currentPairs.newPairs = newPairs;
                    return currentPairs;
                });
            resetWorkerIdleTimeout();
        };

        pairWorker.onerror = (error) =>
            console.error('Pair Worker error:', error);
    }
    return pairWorker;
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (pairWorker) {
            pairWorker.terminate();
            pairWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

async function postMessageToPairWorker(data: EmbeddingsState) {
    pairWorker = await initPairWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    pairWorker.postMessage(data);
}

async function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    await postMessageToPairWorker(currentEmbeddingsState);
}

export default calculateAllPairs;