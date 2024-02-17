import { get } from 'svelte/store';
import { cos_sim } from '@xenova/transformers';
import { embeddingsStore, pairsStore, selectedFeedsStore } from '../components/stores/stores';
import type { Pair } from '$lib/types';

function calculatePairs(
    embeddings: Record<string, number[]>
): Record<string, Pair> {
    const pairsState = get(pairsStore);
    const pairsStoreSnapshot = pairsState.pairs;
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
                newPairs[pairId] = { id1, id2, similarity };
            }
        }
    }

    return newPairs;
}

function calculateAllPairs() {
    const selectedFeeds = get(selectedFeedsStore);
    const embeddings = get(embeddingsStore);
    const allArticleIds = Object.keys(embeddings).filter(id =>
        Object.values(selectedFeeds.feeds).some(feed =>
            feed.some(article => article.id.includes(id))
        )
    );

    const allEmbeddings = allArticleIds.reduce((acc, id) => {
        acc[id] = embeddings[id];
        return acc;
    }, {} as Record<string, number[]>);

    const newPairs = calculatePairs(allEmbeddings);
    pairsStore.update(currentPairs => {
        const updatedPairs = { ...currentPairs.pairs, ...newPairs };
        return { ...currentPairs, pairs: updatedPairs, newPairs };
    });
}


export default calculateAllPairs