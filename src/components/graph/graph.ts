import { getColorFromString } from '$lib/colors';
import chroma from 'chroma-js';
import type { Node, Link, Pair, ArticleType as Article } from '$lib/types';


const DEFAULT_BATCHISIZE = 1;


function articlesToNodes(articles: Article[]): Node[] {
    const center = { x: 0, y: 0 };
    const radius = 0.0001;

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


function quickSelect(arr: number[], k: number): number {
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
    if (percentile < 0 || percentile > 1)
        throw new Error('Percentile must be between 0 and 1');

    let similarities: number[] | null =
        Object.values(links).map(link => link.similarity);

    const thresholdIndex = Math.floor(similarities.length * percentile);
    const threshold = quickSelect(similarities, thresholdIndex + 1); // quickSelect is 1-based for k
    similarities = null;

    return Object.fromEntries(
        Object.entries(links).filter(([, link]) => link.similarity >= threshold)
    );
}

function* nodesToLinksGenerator(
    nodes: Node[],
    pairsStore: Record<string, Pair>,
    batchSize: number = DEFAULT_BATCHISIZE
): Generator<Link[]> {
    if (Object.keys(pairsStore).length > 0) {
        let links: Link[] = [];
        const filteredLinks: Record<string, Pair> | null = filterLinksByPercentile(pairsStore);
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const mix = chroma.mix(nodes[i].color, nodes[j].color, 0.5, 'rgb');
                const day = mix.brighten(0.27).hex();
                const night = mix.darken(0.77).hex();
                const similarity = getSimilarity(nodes[i].id, nodes[j].id, filteredLinks as Record<string, Pair>);
                if (similarity) {
                    links.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        weight: similarity,
                        color: day,
                        day_color: day,
                        night_color: night
                    });
                }
                if (links.length >= batchSize) {
                    yield links;
                    links = []; // Reset the links array after yielding
                }
            }
        }
        // Yield any remaining links in the batch
        if (links.length > 0) {
            yield links;
        }
    } else yield [];
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

async function processLinks(nodes: Node[], pairsStore: Record<string, Pair>): Promise<Link[]> {
    const linkGenerator = nodesToLinksGenerator(nodes, pairsStore);
    const allLinks: Link[] = [];


    // for (const linksBatch of linkGenerator) 
    //     allLinks = allLinks.concat(linksBatch);


    for (const linksBatch of linkGenerator)
        for (const link of linksBatch)
            allLinks.push(link);

    return allLinks;
}

export {
    articlesToNodes,
    processLinks
}
