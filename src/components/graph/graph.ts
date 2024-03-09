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
        size: 10,
    }));
}

function* nodesToLinksGenerator(
    nodes: Array<{ id: string; color: string }>,
    pairsStore: Record<string, Pair>,
    batchSize: number = DEFAULT_BATCHISIZE
): Generator<Link[]> {
    let links: Link[] = [];
    const nodeColorMap = new Map(nodes.map(node => [node.id, node.color]));
    const colorMixesMap = new Map<string, { day: string; night: string }>();

    // Precompute all possible color mixes
    for (const color1 of nodeColorMap.values()) {
        for (const color2 of nodeColorMap.values()) {
            const key = [color1, color2].sort().join('_');
            if (!colorMixesMap.has(key)) {
                const mix = chroma.mix(color1, color2, 0.5, 'rgb');
                const day = mix.brighten(0.27).hex();
                const night = mix.darken(0.77).hex();
                colorMixesMap.set(key, { day, night });
            }
        }
    }

    // Use precomputed color mixes to generate links
    for (const [pairKey, pair] of Object.entries(pairsStore)) {
        const [sourceId, targetId] = pairKey.split('_');
        const sourceColor = nodeColorMap.get(sourceId);
        const targetColor = nodeColorMap.get(targetId);

        if (sourceColor && targetColor) {
            const key = [sourceColor, targetColor].sort().join('_');
            const { day, night } = colorMixesMap.get(key) as { day: string; night: string };

            links.push({
                source: sourceId,
                target: targetId,
                weight: pair.similarity,
                color: day,
                day_color: day,
                night_color: night
            });
        }

        if (links.length >= batchSize) {
            yield links;
            links = [];
        }
    }

    if (links.length > 0) {
        yield links;
    }
}

async function processLinks(nodes: Node[], pairsStore: Record<string, Pair>): Promise<Link[]> {
    const linkGenerator = nodesToLinksGenerator(nodes, pairsStore);
    const allLinks: Link[] = [];

    for (const linksBatch of linkGenerator)
        for (const link of linksBatch)
            allLinks.push(link);

    return allLinks;
}

export {
    articlesToNodes,
    processLinks
}
