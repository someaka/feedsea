import { cos_sim } from '@xenova/transformers';
import type { Pair, EmbeddingsState, EmbeddingsCache } from "./types";

self.addEventListener('message', (event) => {
    const newPairs = calculatePairs(event.data);
    self.postMessage({ newPairs });
});

function calculatePairs(task: EmbeddingsState): Record<string, Pair> {
    const results: Record<string, Pair> = {};

    let embeddings: EmbeddingsCache | null = task.embeddings;
    let newEmbeddings: EmbeddingsCache | null = task.newEmbeddings;

    let newEmbeddingKeys: string[] | null =
        Object.keys(newEmbeddings);
    let currentEmbeddingKeys: string[] | null =
        Object.keys(embeddings).filter(key => !newEmbeddingKeys?.includes(key));

    for (const newKey of newEmbeddingKeys)
        for (const currentKey of currentEmbeddingKeys)
            results[`${newKey}-${currentKey}`] = {
                id1: newKey, id2: currentKey,
                similarity: (cos_sim(embeddings[newKey], embeddings[currentKey]) + 1) / 2
            };

    newEmbeddingKeys = null;
    currentEmbeddingKeys = null;

    embeddings = null;
    newEmbeddings = null;

    return results;
}

export { };