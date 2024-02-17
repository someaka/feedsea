import { cos_sim } from '@xenova/transformers';

import type { Pair } from "./types";

self.addEventListener('message', (event) => {
    const { embeddings, pairsStoreSnapshot } = event.data;
    const newPairs = calculatePairs(embeddings, pairsStoreSnapshot);
    self.postMessage({ newPairs });
});

function calculatePairs(
    embeddings: Record<string, number[]>,
    pairsStoreSnapshot: Record<string, Pair>
): Record<string, Pair> {

    const newPairs: Record<string, Pair> = {};
    const ids = Object.keys(embeddings);

    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const id1 = ids[i];
            const id2 = ids[j];
            const pairId = `${id1}-${id2}`;
            const reveId = `${id2}-${id1}`;

            if (!pairsStoreSnapshot[pairId] && !pairsStoreSnapshot[reveId]) {
                const similarity = cos_sim(embeddings[id1], embeddings[id2]);
                const normalizedSimilarity = (similarity + 1) / 2;
                newPairs[pairId] = { id1, id2, similarity: normalizedSimilarity };
            }
        }
    }

    return newPairs;
}

export {}