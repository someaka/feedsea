import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let pairWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

function initializePairWorker() {
    import('$lib/pairWorker?worker').then(module => {
        pairWorker = new module.default();
        pairWorker.onmessage = (event) => {
            const newPairs = event.data;
            pairsStore.update(currentPairs => {
                Object.assign(currentPairs.pairs, newPairs);
                currentPairs.newPairs = newPairs;
                return currentPairs;
            });
            resetWorkerIdleTimeout();
        };

        pairWorker.onerror = (error) => {
            console.error('Pair Worker error:', error);
        };
    });
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

function postMessageToPairWorker(data: EmbeddingsState) {
    if (!pairWorker) initializePairWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    pairWorker?.postMessage(data);
}

async function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    postMessageToPairWorker(currentEmbeddingsState);
}

export { calculateAllPairs, initializePairWorker }