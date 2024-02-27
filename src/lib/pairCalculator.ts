
import { pairsStore } from './stores/stores';
import type { EmbeddingsState } from '$lib/types';
import fastq from 'fastq';

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
            const pairs = { ...currentPairs.pairs, ...newPairs };
            return { pairs, newPairs };
        });
    };

    worker.onerror = (error) => {
        console.error('Worker error:', error);
    };
}

initListeners();

const queueWorker = fastq.promise(processTask, 1); // Adjust concurrency as needed

async function processTask(task: EmbeddingsState): Promise<void> {
    worker.postMessage(task);
}

function calculateAllPairs(currentEmbeddingsState: EmbeddingsState) {
    const newEmbeddings = currentEmbeddingsState.newEmbeddings;
    if (!newEmbeddings || Object.keys(newEmbeddings).length === 0) return;

    queueWorker.push(currentEmbeddingsState);
}

export default calculateAllPairs;