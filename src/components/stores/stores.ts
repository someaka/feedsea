import { writable } from 'svelte/store';

import type {
   FeedWithUnreadStories,
   ArticleType as Article,
   SelectedFeedsState,
   GraphData,
   Pair
} from '$lib/types';



const feedCache: Record<string, FeedWithUnreadStories> = {};
const articleCache: Record<string, Article[]> = {};
const embeddingCache : Record<string, number[]> = {};
const pairsCache: Record<string, Pair> = {};
const graphData : GraphData = { nodes: [], links: [] };

const feedsStore = writable(feedCache);
const articlesStore = writable(articleCache);
const embeddingsStore = writable(embeddingCache);
const pairsStore = writable(pairsCache);
const graphDataStore = writable(graphData);


const initialState: SelectedFeedsState = {
   feeds: {},
   change: undefined
};

const selectedFeedsStore = writable<SelectedFeedsState>(initialState);

export {
   feedsStore,
   articlesStore,
   selectedFeedsStore,
   embeddingsStore,
   pairsStore,
   graphDataStore
}