import { derived, writable, get } from 'svelte/store';
import fastq from 'fastq';
import { storesLogger as logger } from '../../logger';
import queueNewArticles from '$lib/embedFetch'; //'$lib/embedTransformers';
import calculateAllPairs from '$lib/pairCalculator';
import {
   addAll, addBoth, addNewLinks, addNewNodes, refreshRenderer, removeNodes
} from '../../components/graph/graphologySigma';

import type {
   FeedWithUnreadStories,
   ArticleType as Article,
   SelectedFeedsState,
   GraphData, Node, Link,
   Pair, EmbeddingsState,
   NodeUpdate, LinkUpdate
} from '$lib/types';
import queueArticlesToNodes from '$lib/articlesToNodes';
import queueNodesToLinks from '$lib/nodesToLinks';



const feedCache: Record<string, FeedWithUnreadStories> = {};
const articleCache: Record<string, Article[]> = {};

const feedsStore = writable(feedCache);
const articlesStore = writable(articleCache);


const initialEmbeddingsState: EmbeddingsState = {
   embeddings: {},
   newEmbeddings: {}
}


const embeddingsStore = writable<EmbeddingsState>(initialEmbeddingsState);

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
      if (Object.keys($embeddingsStore).length > 0) {
         calculateAllPairs($embeddingsStore);
         set({ status: 'success', message: 'Pairs calculated successfully.' });
      }
   },
   { status: 'idle', message: '' }
);


const nodesStoreUpdate = derived(
   selectedFeedsStore,
   ($selectedFeedsStore, set) => {
      if ($selectedFeedsStore.change?.type === 'new') {
         const newArticles = $selectedFeedsStore.change.articles as Article[];
         queueArticlesToNodes(newArticles);
         set({ status: 'success', message: 'Articles turned into nodes successfully.' });
      }
   },
   { status: 'idle', message: '' }
);

const initialNodeUpdate: NodeUpdate = {
   nodes: [],
   newNodes: []
};

const nodesStore = writable<NodeUpdate>(initialNodeUpdate);


interface PairsState {
   pairs: Record<string, Pair>;
   newPairs: Record<string, Pair>;
}
const initialPairsState: PairsState = {
   pairs: {},
   newPairs: {}
};
const pairsStore = writable<PairsState>(initialPairsState);


const initialLinksUpdate: LinkUpdate = {
   links: [],
   newLinks: []
};

const linksStoreUpdate = derived(
   pairsStore,
   ($pairsStore, set) => {
      queueNodesToLinks(get(nodesStore).nodes, $pairsStore.newPairs);
      set({ status: 'success', message: 'Pairs turned into Links successfully.' });
   },
   { status: 'idle', message: '' }
);

const linksStore = writable<LinkUpdate>(initialLinksUpdate);





const newNodesStore = derived(
   [nodesStore],
   ([$nodesStore], set) => {
      const selectedArticleIds = new Set<string>();
      get(selectedFeedsStore).feedIds.forEach(feedId => {
         const articlesForFeed = articleCache[feedId];
         if (articlesForFeed)
            articlesForFeed.forEach(article => selectedArticleIds.add(article.id));
      });
      const nodes = $nodesStore.newNodes.filter(
         node => selectedArticleIds.has(node.id)
      );
      enqueueGraphOperation({ type: 'addNodes', data: nodes });
      queueRefreshRenderer();
      logger.log("Nodes Added");
      set({ status: 'success', message: 'Nodes added successfully.' });
   },
   { status: 'idle', message: '' }
);

const newLinksStore = derived(
   [linksStore],
   ([$linksStore], set) => {
      const selectedArticleIds = new Set<string>();
      get(selectedFeedsStore).feedIds.forEach(feedId => {
         const articlesForFeed = articleCache[feedId];
         if (articlesForFeed) {
            articlesForFeed.forEach(article => selectedArticleIds.add(article.id));
         }
      });
      const links = $linksStore.newLinks.filter(
         link =>
            selectedArticleIds.has(link.source.id) &&
            selectedArticleIds.has(link.target.id)
      );
      enqueueGraphOperation({ type: 'addLinks', data: links });
      queueRefreshRenderer();
      logger.log("Links Added");
      set({ status: 'success', message: 'Links added successfully.' });
   },
   { status: 'idle', message: '' }
);





async function addSelectedNodes(
   feedIds: Set<number>,
   newFeedId: number,
   articles: Record<string, Article[]>,
   nodes: Node[],
   links: Link[]
) {
   return new Promise(resolve => {
      const selectedFeedIds = feedIds;

      const selectedArticleIdsSet = new Set<string>();
      selectedFeedIds.forEach((feedId: string | number) =>
         articles[feedId]?.forEach((article: { id: string; }) =>
            selectedArticleIdsSet.add(article.id))
      );
      const articlesToAdd = articles[newFeedId];
      if (articlesToAdd) {
         const articleIdsSet = new Set(articlesToAdd.map((article) => article.id));
         const newNodes = nodes.filter((node) => articleIdsSet.has(node.id));
         const newLinks = links.filter((link) =>
            (articleIdsSet.has(link.source.id) && selectedArticleIdsSet.has(link.target.id))
            ||
            (selectedArticleIdsSet.has(link.source.id) && articleIdsSet.has(link.target.id))
         );
         enqueueGraphOperation({ type: 'addBoth', data: { nodes: newNodes, links: newLinks } });
         queueRefreshRenderer();
         resolve(undefined);
      }
   })
}

async function removeSelectedNodes(
   feedIds: Set<number>,
   newFeedId: number,
   articles: Record<string, Article[]>,
   nodes: Node[],
   links: Link[]
) {
   return new Promise(resolve => {
      const feedsToGet = feedIds;
      const articlesToRemove = articles[newFeedId];
      const articlesToAdd = Array.from(feedsToGet).flatMap(feedId => articles[feedId] || []);
      if (!articlesToAdd || !articlesToRemove) return;
      const articleIdsSet = new Set(articlesToAdd.map(article => article.id));
      const newNodes = nodes.filter(node => articleIdsSet.has(node.id));
      const nodeIds = new Set(newNodes.map(node => node.id));
      const newLinks = links.filter(link =>
         nodeIds.has(link.source.id) && nodeIds.has(link.target.id)
      );
      const removeIdsSet = new Set(articlesToRemove.map(article => article.id));
      const removeNodes = nodes.filter(node => removeIdsSet.has(node.id));

      enqueueGraphOperation({ type: 'removeNodes', data: { nodes: removeNodes, links: newLinks } });
      queueRefreshRenderer();
      resolve(undefined);
   });
}

async function allSelectedNodes(
   articlesToAdd: Article[], nodes: Node[], links: Link[]
) {
   return new Promise(resolve => {
      if (!articlesToAdd) return;
      const articleIdsSet = new Set(articlesToAdd.map(article => article.id));
      const newNodes = nodes.filter(node => articleIdsSet.has(node.id));
      enqueueGraphOperation({ type: 'addAll', data: { nodes: newNodes, links } });
      queueRefreshRenderer();
      resolve(undefined);
   })
}


const articlesWithNodesAndLinksStore = derived(
   [selectedFeedsStore],
   ([$selectedFeedsStore], set) => {
      if (!$selectedFeedsStore.change || $selectedFeedsStore.change.type === 'new') return;
      const articles = get(articlesStore);
      const nodes = get(nodesStore).nodes;
      const links = get(linksStore).links;

      switch ($selectedFeedsStore.change.type) {
         case 'add': {
            addSelectedNodes(
               $selectedFeedsStore.feedIds,
               $selectedFeedsStore.change.feedId,
               articles,
               nodes,
               links
            );
            break;
         }
         case 'remove': {
            removeSelectedNodes(
               $selectedFeedsStore.feedIds,
               $selectedFeedsStore.change.feedId,
               articles,
               nodes,
               links
            );
            break;
         }
         case 'all': {
            allSelectedNodes(
               $selectedFeedsStore.change.articles || [],
               nodes,
               links
            );
            break;
         }
      }
      set({ status: 'success', message: 'Graph updated successfully.' });
   },
   { status: 'idle', message: '' }
);


let refreshTimeoutId: number | null = null;
const minimumInterval = 1000;

function queueRefreshRenderer(numNodes: number = 2) {
   const adjustment = Math.min(20, Math.sqrt(numNodes));
   const adjustedInterval = minimumInterval * adjustment;

   // Clear the existing timeout if it exists to debounce the refresh calls
   if (refreshTimeoutId !== null) {
      clearTimeout(refreshTimeoutId);
   }

   // Set a new timeout to delay the refresh operation
   refreshTimeoutId = setTimeout(() => {
      // requestAnimationFrame(() => {
         refreshRenderer();
         refreshTimeoutId = null; // Reset the timeout ID after the refresh is scheduled
         console.log('Refreshed renderer after ' + adjustedInterval + 'ms');
      // });
   }, adjustedInterval) as unknown as number; // Type assertion here
}




// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function queueRefreshRenderer(numNodes: number = 1) {
//          refreshRenderer();
// }








interface GraphOperation {
   type: 'addNodes' | 'addLinks' | 'addBoth' | 'addAll' | 'removeNodes';
   data: Node[] | Link[] | GraphData
}

async function graphOperationWorker(task: GraphOperation) {
   switch (task.type) {
      case 'addNodes':
         addNewNodes(task.data as Node[]);
         break;
      case 'addLinks':
         addNewLinks(task.data as Link[]);
         break;
      case 'removeNodes':
         removeNodes(task.data as GraphData);
         break;
      case 'addBoth': {
         addBoth(task.data as GraphData);
         break;
      }
      case 'addAll': {
         addAll(task.data as GraphData);
         break;
      }
      default:
         console.error('Unsupported operation');
   }
}

const graphOperationQueue = fastq.promise(graphOperationWorker, 1);

function enqueueGraphOperation(operation: GraphOperation) {
   graphOperationQueue.push(operation);
}


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
   nodesStoreUpdate,
   linksStore,
   linksStoreUpdate,
   newNodesStore,
   newLinksStore,
   articlesWithNodesAndLinksStore,
   focusedArticleId
}