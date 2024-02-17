import { getColorFromString } from '$lib/colors';
import chroma from 'chroma-js';
import type { Node, Link, Pair, ArticleType as Article } from '$lib/types';

function articlesToNodes(articles: Article[]): Node[] {
    const center = { x: 0, y: 0 };
    const radius = 0.11;

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


function filterLinksByPercentile(links: Record<string, Pair>, percentile = 0.5): Record<string, Pair> {
    const similarities = Object.values(links).map(link => link.similarity).filter(weight => weight > 0);
    const sortedSimilarities = similarities.sort((a, b) => b - a);
    const thresholdIndex = Math.floor(sortedSimilarities.length * percentile);
    const threshold = sortedSimilarities[thresholdIndex];
    const filteredLinksEntries = Object.entries(links).filter(([, link]) => link.similarity >= threshold);
    return Object.fromEntries(filteredLinksEntries);
}

function nodesToLinks(
    nodes: Node[],
    pairsStore: Record<string, Pair>
): Link[] {

    const links = [];
    const filteredLinks = filterLinksByPercentile(pairsStore);

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const mix = chroma.mix(nodes[i].color, nodes[j].color, 0.5, 'rgb');
            const day = mix.brighten(0.07).hex();
            const night = mix.darken(0.77).hex();
            const similarity = getSimilarity(nodes[i].id, nodes[j].id, filteredLinks);
            if (similarity) links.push({
                source: nodes[i],
                target: nodes[j],
                weight: similarity,
                color: day,
                day_color: day,
                night_color: night
            });
        }
    }
    return links;
}

function getSimilarity(
    id1: string,
    id2: string,
    pairsStore: Record<string, { similarity: number }>
): number {
    const pairKey = `${id1}-${id2}`;
    const reverseKey = `${id2}-${id1}`;
    const pair = pairsStore[pairKey] || pairsStore[reverseKey];
    return pair?.similarity;
}

export {
    articlesToNodes,
    nodesToLinks
}