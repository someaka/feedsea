import { getColorFromString } from '$lib/colors';
import chroma from 'chroma-js';
import type { Node, Link, Pair, ArticleType as Article } from '$lib/types';

function articlesToNodes(articles: Article[]): Node[] {
    const center = { x: 0, y: 0 };
    const radius = 0.0011;

    return articles.map((article: Article) => ({
        id: article.id,
        title: article.title,
        color: getColorFromString(article.feedColor),
        x: center.x + Math.random() * radius * Math.cos(Math.random() * Math.PI * 2),
        y: center.y + Math.random() * radius * Math.sin(Math.random() * Math.PI * 2),
        vx: 0,
        vy: 0,
        degree: 0,
        mass: 0,
        size: 10
    }));
}


function quickSelect(arr: number[], k: number): number | null {
    // Partition the array around a pivot
    const pivot = arr[Math.floor(Math.random() * arr.length)];
    const lower: number[] = [];
    const higher: number[] = [];
    arr.forEach((num) => {
        if (num < pivot)
            lower.push(num);
        else if (num > pivot)
            higher.push(num);
    });
    if (k <= lower.length)
        return quickSelect(lower, k);
    if (k > arr.length - higher.length)
        return quickSelect(higher, k - (arr.length - higher.length));
    return pivot;
}

function filterLinksByPercentile(links: Record<string, Pair>, percentile = 0.5): Record<string, Pair> {
    let similarities: number[] | null =
        Object.values(links).map(link => link.similarity).filter(weight => weight > 0);

    quickSelect(similarities, Math.floor(similarities.length * percentile));
    const threshold = similarities[Math.floor(similarities.length * percentile)];
    similarities = null;

    const filteredLinksEntries = Object.entries(links).filter(([, link]) => link.similarity >= threshold);
    return Object.fromEntries(filteredLinksEntries);
}

// function filterLinksByPercentile(links: Record<string, Pair>, percentile = 0.5): Record<string, Pair> {
//     let similarities: number[] | null =
//         Object.values(links).map(link => link.similarity).filter(weight => weight > 0);
//     let sortedSimilarities: number[] | null =
//         similarities.sort((a, b) => b - a);
//     const thresholdIndex = Math.floor(sortedSimilarities.length * percentile);
//     const threshold = sortedSimilarities[thresholdIndex];
//     similarities = null;
//     sortedSimilarities = null;

//     const filteredLinksEntries = Object.entries(links).filter(([, link]) => link.similarity >= threshold);
//     return Object.fromEntries(filteredLinksEntries);
// }

function nodesToLinks(
    nodes: Node[],
    pairsStore: Record<string, Pair>
): Promise<Link[]> {
    return new Promise((resolve) => {
        const links: Link[] = [];
        let filteredLinks: Record<string, Pair> | null = filterLinksByPercentile(pairsStore);
        let i = 0;
        let j = i + 1;
        const batchSize = 10000000;
        const delayMs = 0; // Math.log(Object.keys(filteredLinks).length + 1); // Delay in milliseconds 

        const processLink = () => {
            let processed = 0;
            while (i < nodes.length && processed < batchSize) {
                if (j < nodes.length) {
                    const mix = chroma.mix(nodes[i].color, nodes[j].color, 0.5, 'rgb');
                    const day = mix.brighten(0.27).hex();
                    const night = mix.darken(0.77).hex();
                    const similarity = getSimilarity(nodes[i].id, nodes[j].id, filteredLinks as Record<string, Pair>);
                    if (similarity) links.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        weight: similarity,
                        color: day,
                        day_color: day,
                        night_color: night
                    });
                    j++;
                    processed++;
                } else {
                    i++;
                    j = i + 1;
                }
            }

            if (i < nodes.length) {
                setTimeout(processLink, delayMs);
            } else {
                filteredLinks = null;
                resolve(links);
            }
        };

        processLink();
    });
}

function getSimilarity(
    id1: string, id2: string,
    pairsStore: Record<string, { similarity: number }>
): number | undefined {
    const pairKey = `${id1}-${id2}`;
    const reveKey = `${id2}-${id1}`;
    const pair = pairsStore[pairKey] || pairsStore[reveKey];
    return pair?.similarity;
}

export {
    articlesToNodes,
    nodesToLinks
}
