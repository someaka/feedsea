import { cos_sim } from '@xenova/transformers';
import type { Pair, EmbeddingsState, EmbeddingsCache } from "./types";

self.addEventListener('message', async (event) => {
    self.postMessage(await calculatePairs(event.data));
});

function calculatePairs(task: EmbeddingsState | null): Promise<Record<string, Pair>> {
    return new Promise((resolve) => {
        const results: Record<string, Pair> = {};
        let embeddings: EmbeddingsCache | null = (task as EmbeddingsState).embeddings;
        let newEmbeddings: EmbeddingsCache | null = (task as EmbeddingsState).newEmbeddings;

        let newEmbeddingKeys: string[] | null = Object.keys(newEmbeddings || {});
        let currentEmbeddingKeys: string[] | null = Object.keys(embeddings || {}).filter(key => !(newEmbeddingKeys as string[]).includes(key));

        let i = 0;
        let j = 0; // Introduce a new variable to track the current position in currentEmbeddingKeys
        const batchSize = 100; // Number of pairs to process before yielding
        const delayMs = 1; // Delay in milliseconds before processing the next batch

        const processPair = () => {
            let processed = 0;
            while (i < (newEmbeddingKeys as string[]).length && processed < batchSize) {
                const newKey: string = (newEmbeddingKeys as string[])[i];
                while (j < (currentEmbeddingKeys as string[]).length && processed < batchSize) {
                    const currentKey: string = (currentEmbeddingKeys as string[])[j];
                    results[`${newKey}-${currentKey}`] = {
                        id1: newKey, id2: currentKey,
                        similarity: (cos_sim(
                            (newEmbeddings as EmbeddingsCache)[newKey],
                            (embeddings as EmbeddingsCache)[currentKey]
                        ) + 1) / 2
                    };
                    processed++;
                    j++; // Move to the next currentKey
                }
                if (j >= (currentEmbeddingKeys as string[]).length) {
                    i++; // Move to the next newKey only if all currentKeys have been processed
                    j = 0; // Reset j for the next newKey
                }
                if (processed >= batchSize) {
                    break; // Exit the loop if batchSize is reached
                }
            }

            if (i < (newEmbeddingKeys as string[]).length) {
                setTimeout(processPair, delayMs);
            } else {
                // Cleanup and resolve the promise
                newEmbeddingKeys = null;
                currentEmbeddingKeys = null;
                embeddings = null;
                newEmbeddings = null;
                task = null;
                resolve(results);
            }
        };

        processPair();
    });
}

export { };