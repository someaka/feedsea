import { graphLogger as logger } from '../logger';
import { visualizeGraph, clearGraph } from "./graphologySigma";
import { createPairKey, reversePairKey } from './graphHelpers';
import { getColorFromString } from '$lib/colors';


import type { ArticleType as Article } from '$lib/types';
// import { articlesCache } from "../Feeds/data/FeedCache.js";

import chroma from "chroma-js";

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;


export interface Node {
    id: string;
    title: string;
    color: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    degree: number;
    mass: number;
    size: number;
}

export interface Link {
    source: Node;
    target: Node;
    weight: number;
    color: string,
    day_color: string,
    night_color: string
}

class Graph {
    static instance: Graph | null = null;
    static getInstance() {
        if (!this.instance) {
            this.instance = new Graph();
        }
        return this.instance;
    }
    similarityPairs: Map<string, number>;
    existingEdgesSet: Set<string>;
    negativeEdges: boolean;
    dimensions: { width: number; height: number };

    constructor() {
        this.similarityPairs = new Map();
        this.existingEdgesSet = new Set();
        this.negativeEdges = false;
        this.dimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }


    setNegativeEdges(value: boolean) {
        this.negativeEdges = value;
        logger.log('Negative edges set to:', this.negativeEdges.toString());
        this.updateGraphForSelectedFeeds();
    }



    articlesToNodes(articles: Article[]) : Node[] {
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

    articlesToLinks(nodes: Node[]): Link[] {
        const links = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const mix = chroma.mix(nodes[i].color, nodes[j].color, 0.5, 'rgb');
                const day = mix.brighten(0.77).hex();
                const night = mix.darken(0.77).hex();
                links.push({
                    source: nodes[i],
                    target: nodes[j],
                    weight: this.getSimilarity(nodes[i].id, nodes[j].id),
                    color: day,
                    day_color: day,
                    night_color: night
                });
            }
        }
        return links;
    }

    getSimilarity(id1: string, id2: string): number {
        const pairKey = createPairKey(id1, id2);
        const reveKey = reversePairKey(pairKey);
        const res = this.similarityPairs.get(pairKey) || this.similarityPairs.get(reveKey) || -2;
        return res;
    }


    filterEdgesByPercentile(edges: Link[], percentile = 0.2) {
        // Calculate the threshold weight based on the percentile
        const weights = edges.map((edge: { weight: number; }) => this.normalizeEdgeWeight(edge.weight));
        const sortedWeights = Array.from(weights).sort(( a,  b) => a - b);
        const postitiveWeights = sortedWeights.filter(( weight) => weight >= 0);
        const index = Math.floor(percentile * postitiveWeights.length);
        const threshold = postitiveWeights[index];

        return edges.filter((edge: { weight: number; }) => this.normalizeEdgeWeight(edge.weight) >= threshold);

    }

    normalizeEdgeWeight(edgeWeight: number) {
        // Normalize edge weights from [-1, 1] to [0, 1]
        return (edgeWeight + 1) / 2;
    }






    async updateGraphForSelectedFeeds(newSimilarityPairs: Map<string, number> | null = null, emptyArticles = false) {
        // Update the existingEdgesSet
        if (newSimilarityPairs) {
            for (const [edge, score] of newSimilarityPairs.entries()) {
                if (!this.existingEdgesSet.has(edge) && !this.existingEdgesSet.has(reversePairKey(edge))) {
                    this.existingEdgesSet.add(edge);
                    this.existingEdgesSet.add(reversePairKey(edge));
                    this.similarityPairs.set(edge, score);
                    this.similarityPairs.set(reversePairKey(edge), score);
                }

            }
        }


        let nodes: Node[] = [];
        let links = [];

        const selectedFeedsElements = document.querySelectorAll('#feedslist div.clicked');

        // Create a map of selected feed IDs for quick lookup
        const selectedFeedIds = new Set();
        selectedFeedsElements.forEach(feedElement => {
            const { id: feedId } = feedElement;
            selectedFeedIds.add(feedId);
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        selectedFeedsElements.forEach(feedElement => {
            // TODO Replace this with SvelteKit logic
            // const { id: feedId } = feedElement;
            // let feedArticles = articlesCache[feedId];
            let feedArticles: Article[] = [];

            if (feedArticles) {
                // Filter out articles with empty strings if emptyArticles is false
                if (!emptyArticles) {
                    feedArticles = feedArticles.filter((article: Article) => article.id && article.title && article.text);
                }

                const newNodes = this.articlesToNodes(
                    feedArticles.map((article: Article) => ({
                        id: article.id || '',
                        feedId: article.feedId || '',
                        feedColor: article.feedColor || '',
                        title: article.title || '',
                        text: article.text || '',
                        url: article.url || ''
                    }))
                );

                nodes = nodes.concat(newNodes);
            }
        });


        if (nodes.length > 0) {
            links = this.articlesToLinks(nodes);
            links = this.negativeEdges ? links : this.filterEdgesByPercentile(links, 0.5);
            visualizeGraph({ nodes, links });
        } else {
            clearGraph();
        }
    }

}


const updateGraphForSelectedFeeds = (newSimilarityPairs: Map<string, number> | null = null) =>
    Graph.getInstance().updateGraphForSelectedFeeds(newSimilarityPairs);

const setNegativeEdges = (value: boolean) => Graph.getInstance().setNegativeEdges(value);

const negativeEdges: boolean = Graph.getInstance().negativeEdges;

const handleAddition: (id: number, articles : Article[]) => void = () => {
    console.log('handleAddition');
};
const handleRemoval: (id: number) => void = () => {
    console.log('handleRemoval');
};

export {
     handleAddition, handleRemoval ,
    updateGraphForSelectedFeeds,
    setNegativeEdges,
    negativeEdges
}
