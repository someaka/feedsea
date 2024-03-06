import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let pairWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;

function initializePairWorker() {
    import('$lib/pairWorker?worker').then(module => {
        pairWorker = new module.default();
        pairWorker.onmessage = (event) => {
            const newPairs = event.data;
            pairsStore.update(currentPairs => {
                Object.assign(currentPairs.pairs, newPairs);
                return { pairs: currentPairs.pairs, newPairs };
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
    }, 10000);
}

function postMessageToPairWorker(data: EmbeddingsState) {
    if (!pairWorker) {
        initializePairWorker();
    }
    pairWorker?.postMessage(data);
    resetWorkerIdleTimeout();
}

async function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    postMessageToPairWorker(currentEmbeddingsState);
}

export { calculateAllPairs, initializePairWorker }