import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let pairWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
let PairsWorkerModule: typeof import('$lib/pairWorker?worker') | null = null;
const TIMEOUT_INTERVAL = 60 * 1000;

async function initPairWorker(): Promise<Worker> {
    if (!pairWorker) {
        if (!PairsWorkerModule)
            PairsWorkerModule = await import('$lib/pairWorker?worker')
        pairWorker = new PairsWorkerModule.default();
        pairWorker.onmessage = (event) => {
            const newPairs = event.data;
            if (Object.values(newPairs).length > 0)
                pairsStore.update(currentPairs => {
                    Object.assign(currentPairs.pairs, newPairs);
                    currentPairs.newPairs = newPairs;
                    return currentPairs;
                });
            // resetWorkerIdleTimeout();
        };

        pairWorker.onerror = (error) =>
            console.error('Pair Worker error:', error);
    }
    return pairWorker;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(terminatePairWorker, TIMEOUT_INTERVAL);
}
function terminatePairWorker() {
    if (pairWorker) {
        pairWorker.terminate();
        pairWorker = null;
    }
}

async function postMessageToPairWorker(data: EmbeddingsState) {
    pairWorker = await initPairWorker();
    // clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    pairWorker.postMessage(data);
}

async function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    await postMessageToPairWorker(currentEmbeddingsState);
}

export default calculateAllPairs;