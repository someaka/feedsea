import { handleAddition } from './graph';
import { getColorFromString } from '$lib/colors';
import { embeddingsStore, pairsStore } from '../stores/stores';
import { pipeline, cos_sim } from '@xenova/transformers';
import { get } from 'svelte/store';

import chroma from 'chroma-js';

import type {
    ArticleType as Article,
    Pair, PendingPair,
    GraphData, Link, Node
} from '$lib/types';

const extractor = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-base-en',
    { quantized: true }
);



let articlesQueue: Article[] = [];
let isCooldownActive = false;


async function getEmbeddings(articles: Article[]): Promise<Record<string, number[]>> {
    try {
        const articlesText = articles.map(article => `${article.title} ${article.text}`);
        const vectors = await extractor(articlesText, { pooling: 'mean' });
        const embeddingsList: number[][] = vectors.tolist().flat();

        const embeddingsWithIds = articles.reduce((acc, article, index) => {
            acc[article.id] = embeddingsList[index];
            return acc;
        }, {} as Record<string, number[]>);

        embeddingsStore.set(embeddingsWithIds);
        return embeddingsWithIds;
    } catch (error) {
        console.error("Failed to get embeddings:", error);
        throw error;
    }
}



async function handleNewArticles(feedId: number, articles: Article[]) {
    articlesQueue.push(...articles);

    if (!isCooldownActive) {
        processQueue();
    }
}

async function processQueue() {
    isCooldownActive = true;

    await new Promise(resolve => setTimeout(resolve, 5000));

    if (articlesQueue.length > 0) {
        const embeddingsWithIds = await getEmbeddings(articlesQueue);

        const nodes = articlesToNodes(articlesQueue);
        const links = nodesToLinks(nodes);

        formNewPairs(embeddingsWithIds);
        calculateSimilarityScores();

        const graphData: GraphData = {
            nodes: nodes,
            links: links
        };
        handleAddition(graphData);

        articlesQueue = [];
    }

    isCooldownActive = false;

    if (articlesQueue.length > 0) {
        processQueue();
    }
}





function articlesToNodes(articles: Article[]): Node[] {
    const center = { x: 0, y: 0 }; // Adjust this if your graph's center is different
    const radius = 0.11; // Small radius around the center for initial node placement


    // COOLEST LOOKING BUG EVER
    // just to be clear the random should be done inside the map
    // but this makes it look awesome


    // Randomize position around the center within the defined radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;

    return articles.map((article: Article) => ({
        id: article.id,
        title: article.title,
        color: getColorFromString(article.feedColor),
        // night_color: getColorFromString(article.feedColor), // no change for now
        x: center.x + distance * Math.cos(angle),
        y: center.y + distance * Math.sin(angle),
        vx: 0,
        vy: 0,
        degree: 0,
        mass: 0,
        size: 10
    }));
}

function nodesToLinks(nodes: Node[]): Link[] {
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const mix = chroma.mix(nodes[i].color, nodes[j].color, 0.5, 'rgb');
            const day = mix.brighten(0.77).hex();
            const night = mix.darken(0.77).hex();
            links.push({
                source: nodes[i],
                target: nodes[j],
                weight: getSimilarity(nodes[i].id, nodes[j].id),
                color: day,
                day_color: day,
                night_color: night
            });
        }
    }
    return links;
}

function getSimilarity(id1: string, id2: string): number {
    const pairKey = `${id1}-${id2}`;
    const reveKey = `${id2}-${id1}`;
    const pair = get(pairsStore)[pairKey] || get(pairsStore)[reveKey];
    return pair?.similarity ?? -2;
}







function formNewPairs(embeddings: Record<string, number[]>): PendingPair[] {
    const articleIds = Object.keys(embeddings);
    return articleIds.flatMap((sourceId, i) =>
        articleIds.slice(i + 1).map(targetId => ({ id1: sourceId, id2: targetId }))
    );
}


function calculateSimilarityScores(): Pair[] {
    const embeddings = get(embeddingsStore);
    const articleIds = Object.keys(embeddings);
    const pairs: Pair[] = [];

    articleIds.forEach(sourceId => {
        articleIds.forEach(targetId => {
            if (sourceId !== targetId) {
                const em1 = embeddings[sourceId] as number[];
                const em2 = embeddings[targetId] as number[];
                const similarity = cos_sim(em1, em2);
                pairs.push({
                    id1: sourceId,
                    id2: targetId,
                    similarity: similarity
                });
            }
        });
    });

    pairsStore.update(currentPairs => {
        const updatedPairs: Record<string, Pair> = { ...currentPairs };
        pairs.forEach(pair => {
            const key = `${pair.id1}-${pair.id2}`;
            updatedPairs[key] = pair;
        });
        return updatedPairs;
    });
    return pairs;
}


export default handleNewArticles