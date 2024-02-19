import { derived, writable, get } from 'svelte/store';
import queueNewArticles from '$lib/transformerEmbeddings';
import calculateAllPairs from '$lib/pairCalculator';
import { articlesToNodes, nodesToLinks } from '../graph/graph';
import { visualizeGraph } from '../graph/graphologySigma';

import type {
   FeedWithUnreadStories,
   ArticleType as Article,
   SelectedFeedsState,
   GraphData, Node, Link,
   Pair
} from '$lib/types';



const feedCache: Record<string, FeedWithUnreadStories> = {};
const articleCache: Record<string, Article[]> = {};
const embeddingCache: Record<string, number[]> = {};

const graphData: GraphData = { nodes: [], links: [] };

const feedsStore = writable(feedCache);
const articlesStore = writable(articleCache);
const embeddingsStore = writable(embeddingCache);

const initialState: SelectedFeedsState = {
   feedIds: new Set(),
   change: undefined
};

const selectedFeedsStore = writable<SelectedFeedsState>(initialState);





const newArticlesStore = derived(
   selectedFeedsStore,
   ($selectedFeedsStore, set) => {
      if ($selectedFeedsStore.change?.type === 'new') {
         const newArticles = $selectedFeedsStore.change.articles as Article[];
         queueNewArticles(newArticles);
         set({ status: 'success', message: 'Embeddings queued successfully.' });
      }
   },
   { status: 'idle', message: '' }
);



const pairsCalculationStore = derived(
   embeddingsStore,
   ($embeddingsStore, set) => {
      calculateAllPairs();
      set({ status: 'success', message: 'Pairs calculated successfully.' });
   },
   { status: 'idle', message: '' }
);


const nodesStore = derived(
   selectedFeedsStore,
   ($selectedFeedsStore, set) => {
      if ($selectedFeedsStore.change?.type === 'new') {
         const newArticles = $selectedFeedsStore.change.articles as Article[];
         const newNodes = articlesToNodes(newArticles);
         const currentNodes = get(nodesStore);
         const updatedNodes = [...currentNodes, ...newNodes];
         set(updatedNodes);
      }
   },
   [] as Node[]
);



interface PairsState {
   pairs: Record<string, Pair>;
   newPairs: Record<string, Pair>;
}

const initialPairsState: PairsState = {
   pairs: {},
   newPairs: {}
};

const pairsStore = writable<PairsState>(initialPairsState);


const linksStore = derived(
   pairsStore,
   ($pairsStore, set) => {
      const currentLinks = get(linksStore);
      const nodes = get(nodesStore);
      const newLinks = nodesToLinks(nodes, $pairsStore.newPairs);
      const updatedLinks = [...currentLinks, ...newLinks];
      set(updatedLinks);
   },
   [] as Link[]
);


const graphDataStore = derived(
   [nodesStore, linksStore],
   ([$nodesStore, $linksStore], set) => {
      const graphData: GraphData = { nodes: $nodesStore, links: $linksStore };
      set(graphData);
   },
   graphData
);


const articlesWithNodesAndLinksStore = derived(
   [selectedFeedsStore, nodesStore, linksStore],
   ([$selectedFeedsStore, $nodesStore, $linksStore], set) => {

      const selectedArticleIds: string[] = [];
      $selectedFeedsStore.feedIds.forEach(feedId => {
         const articlesForFeed = articleCache[feedId];
         if (articlesForFeed) {
            articlesForFeed.forEach(article => selectedArticleIds.push(article.id));
         }
      });

      const nodes = $nodesStore.filter(node => selectedArticleIds.includes(node.id));
      const links = $linksStore.filter(link =>
         selectedArticleIds.includes(link.source.id) && selectedArticleIds.includes(link.target.id)
      );

      visualizeGraph({ nodes, links });
      console.log("Graph updated, you've arrived");

      set({ nodes, links });
   },
   { nodes: [], links: [] } as GraphData
);

const focusedArticleId = writable<string | null>(null);


export {
   feedsStore,
   articlesStore,
   selectedFeedsStore,
   embeddingsStore,
   pairsStore,
   newArticlesStore,
   pairsCalculationStore,
   nodesStore,
   linksStore,
   graphDataStore,
   articlesWithNodesAndLinksStore,
   focusedArticleId
}