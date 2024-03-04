import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';

let currentWorkerIndex = 0;
const workers: Worker[] = [];

async function initWorker(): Promise<Worker> {
    const WorkerModule = await import('$lib/pairWorker?worker');
    return new WorkerModule.default();
}

async function initWorkers(): Promise<void> {
    const numCPUs = // navigator.hardwareConcurrency ||
        1;
    for (let i = 0; i < Math.max(1, numCPUs - 1); i++) {
        const worker = await initWorker();
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        workers.push(worker);
    }
}

function handleWorkerMessage(event: MessageEvent) {
    const { newPairs } = event.data;
    pairsStore.update(currentPairs => {
        const pairs = { ...currentPairs.pairs, ...newPairs };
        return { pairs, newPairs };
    });
}

function handleWorkerError(error: ErrorEvent) {
    console.error('Worker error:', error);
}

function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    if (workers.length === 0) {
        console.error('No workers initialized.');
        return;
    }
    workers[currentWorkerIndex].postMessage(currentEmbeddingsState);
    currentWorkerIndex = (currentWorkerIndex + 1) % workers.length;
}

initWorkers();

export default calculateAllPairs