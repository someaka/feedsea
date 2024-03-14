import type { EmbeddingsState, Pair } from "./types";

self.addEventListener('message', (event) => {
    self.postMessage(processPairs(event.data));
});

function processPairs(task: EmbeddingsState): Record<string, Pair>  {
    const results: Record<string, Pair> = {};
    let newEmbeddingKeys: string[] | null = Object.keys(task.newEmbeddings);
    let embeddingKeys: string[] | null = Object.keys(task.embeddings);

    for (let i = 0; i < newEmbeddingKeys.length; i++) {
        const newEmbedding = newEmbeddingKeys[i];
        for (let j = 0; j < embeddingKeys.length; j++) {
            const currentEmbedding = embeddingKeys[j];
            if (newEmbedding === currentEmbedding) continue;
            
            let dotProduct = 0.0, normA = 0.0, normB = 0.0;
            for (let k = 0; k < task.newEmbeddings[newEmbedding].length; k++) {
                dotProduct += task.newEmbeddings[newEmbedding][k] * task.embeddings[currentEmbedding][k];
                normA += task.newEmbeddings[newEmbedding][k] ** 2;
                normB += task.embeddings[currentEmbedding][k] ** 2;
            }

            results[`${newEmbedding}_${currentEmbedding}`] = {
                id1: newEmbedding,
                id2: currentEmbedding,
                similarity: (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) + 1) / 2
            };
        }
    }
    newEmbeddingKeys = null;
    embeddingKeys = null;
    return results;
}