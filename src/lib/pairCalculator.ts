import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let pairWorker: Worker;
export async function initPairWorker(): Promise<Worker> {
    if (!pairWorker) {
        const PairWorkerModule = await import('$lib/pairWorker?worker');
        pairWorker = new PairWorkerModule.default();

        pairWorker.onmessage = (event) => {
            const newPairs = event.data;
            pairsStore.update(currentPairs => {
                Object.assign(currentPairs.pairs, newPairs);
                return { pairs: currentPairs.pairs, newPairs };
            });
        };

        pairWorker.onerror = (error) => {
            console.error('Pair Worker error:', error);
        };
    }
    return pairWorker;
}

async function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    pairWorker = await initPairWorker();
    pairWorker.postMessage(currentEmbeddingsState);
}

export default calculateAllPairs