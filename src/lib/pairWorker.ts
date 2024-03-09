import type { Pair, EmbeddingsState, EmbeddingsCache } from "./types";

const DEFAULT_BATCHISIZE = 100;

self.addEventListener('message', async (event) => {
    self.postMessage(await processPairs(event.data));
});

async function processPairs(task: EmbeddingsState): Promise<Record<string, Pair>> {
    const results: Record<string, Pair> = {};
    for (const batch of calculatePairsGenerator(task))
        for (const pair of batch)
            Object.assign(results, pair);
    return results;
}

function* calculatePairsGenerator(
    task: EmbeddingsState, batchSize: number = DEFAULT_BATCHISIZE
) {
    if (!task) return;

    const embeddings: EmbeddingsCache = task.embeddings;
    const newEmbeddings: EmbeddingsCache = task.newEmbeddings;

    const newEmbeddingKeys: string[] = Object.keys(newEmbeddings);
    const currentEmbeddingKeys: string[] = Object.keys(embeddings)
    //.filter(key => !newEmbeddingKeys.includes(key));

    let batch = [];

    for (let i = 0; i < newEmbeddingKeys.length; i++) {
        const newKey: string = newEmbeddingKeys[i];
        for (let j = 0; j < currentEmbeddingKeys.length; j++) {
            const currentKey: string = currentEmbeddingKeys[j];
            if (newKey === currentKey) continue;
            const vecA = newEmbeddings![newKey];
            const vecB = embeddings![currentKey];
            let dotProduct = 0.0, normA = 0.0, normB = 0.0;

            for (let k = 0, len = vecA.length; k < len; k++) {
                dotProduct += vecA[k] * vecB[k];
                normA += vecA[k] ** 2;
                normB += vecB[k] ** 2;
            }

            const similarity =
                (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) + 1) / 2;

            batch.push({
                [`${newKey}_${currentKey}`]: {
                    id1: newKey,
                    id2: currentKey,
                    similarity
                }
            });

            if (batch.length >= batchSize) {
                yield batch;
                batch = []; // Reset the batch after yielding
            }
        }
    }

    // Yield any remaining pairs in the batch
    if (batch.length > 0) {
        yield batch;
    }
}