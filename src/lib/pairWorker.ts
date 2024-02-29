// import similarity from 'compute-cosine-similarity';
import { cos_sim } from '@xenova/transformers';
import type { Pair, EmbeddingsState } from "./types";

self.addEventListener('message', (event) => {
    const task = event.data;
    const newPairs = calculatePairs(task);
    self.postMessage({ newPairs });
});

function calculatePairs(task: EmbeddingsState): Record<string, Pair> {
    const { embeddings, newEmbeddings } = task;
    const results: Record<string, Pair> = {};

    const newEmbeddingKeys = Object.keys(newEmbeddings);
    const currentEmbeddingKeys = Object.keys(embeddings).filter(key => !newEmbeddingKeys.includes(key));

    for (const newKey of newEmbeddingKeys) {
        for (const currentKey of currentEmbeddingKeys) {
            const pairKey = `${newKey}-${currentKey}`;

            const similarity = cos_sim(embeddings[newKey], embeddings[currentKey]);
            results[pairKey] = { id1: newKey, id2: currentKey, similarity: (similarity + 1) / 2 };
            
            // const sim = similarity(embeddings[newKey], embeddings[currentKey]) as number;
            // results[pairKey] = { id1: newKey, id2: currentKey, similarity: (sim + 1) / 2 };
        }
    }

    return results;
}

export { };