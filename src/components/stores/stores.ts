import { derived, writable, get } from 'svelte/store';
import queueNewArticles from '$lib/embedFetch'; //'$lib/embedTransformers';
import calculateAllPairs from '$lib/pairCalculator';
import { articlesToNodes, nodesToLinks } from '../graph/graph';
import { addAll, addBoth, addNewLinks, addNewNodes, refreshRenderer, removeNodes } from '../graph/graphologySigma';

import { storesLogger as logger } from '../../logger';

import type {
   FeedWithUnreadStories,
   ArticleType as Article,
   SelectedFeedsState,
   GraphData, Node, Link,
   Pair, EmbeddingsState
} from '$lib/types';



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


const initialNodes = { nodes: [] as Node[], newNodes: [] as Node[] };

const nodesStore = derived(
   selectedFeedsStore,
   ($selectedFeedsStore, set) => {
      if ($selectedFeedsStore.change?.type === 'new') {
         const newArticles = $selectedFeedsStore.change.articles as Article[];
         const newNodes = articlesToNodes(newArticles);
         const currentNodes = get(nodesStore).nodes;
         const updatedNodes = [...currentNodes, ...newNodes];
         set({ nodes: updatedNodes, newNodes });
      }
   },
   initialNodes
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

const initialLinks = { links: [] as Link[], newLinks: [] as Link[] };

const linksStore = derived(
   pairsStore,
   ($pairsStore, set) => {
      const currentLinks = get(linksStore).links;
      const nodes = get(nodesStore).nodes;
      const newLinks = nodesToLinks(nodes, $pairsStore.newPairs);
      const updatedLinks = [...currentLinks, ...newLinks];
      set({ links: updatedLinks, newLinks });
   },
   initialLinks
);







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
      set(nodes);
   },
   [] as Node[]
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
      set(links);
   },
   [] as Link[]
);





async function addSelectedNodes(
   feedIds: Set<number>, newFeedId: number, articles: Record<string, Article[]>, nodes: Node[], links: Link[]
) {
   // Museum piece
   // const selectedFeedIds = new Set(
   //    Object.values($selectedFeedsStore.feedIds)
   //       .map(feedId => feedId.toString())
   //       .map(feedId => articles[feedId])
   //       .flat()
   //       .map(article => article.id)
   // );
   return new Promise(resolve => {
      const selectedFeedIds = feedIds;

      const selectedArticleIdsSet = new Set<string>();
      selectedFeedIds.forEach((feedId: string | number) =>
         articles[feedId]?.forEach((article: { id: string; }) => selectedArticleIdsSet.add(article.id))
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
   feedIds: Set<number>, newFeedId: number, articles: Record<string, Article[]>, nodes: Node[], links: Link[]
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
      set({ nodes, links });
   },
   { nodes: [], links: [] } as GraphData
);


let refreshTimeoutId: number | null = null;
const minimumInterval = 1000;

function queueRefreshRenderer(numNodes: number = 1) {
   const adjustment = Math.min(20, Math.sqrt(numNodes));
   const adjustedInterval = minimumInterval * adjustment;

   // Clear the existing timeout if it exists to debounce the refresh calls
   if (refreshTimeoutId !== null) {
      clearTimeout(refreshTimeoutId);
   }

   // Set a new timeout to delay the refresh operation
   refreshTimeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
         refreshRenderer();
         refreshTimeoutId = null; // Reset the timeout ID after the refresh is scheduled
      });
   }, adjustedInterval) as unknown as number; // Type assertion here
}










import fastq from 'fastq';
import type { done } from 'fastq';

interface GraphOperation {
   type: 'addNodes' | 'addLinks' | 'addBoth' | 'addAll' | 'removeNodes';
   data: Node[] | Link[] | GraphData
}


function asyncify<T extends Node[] | Link[] | GraphData>(fn: (arg: T) => void, thisArg: T) {
   return new Promise((resolve, reject) => {
      try {
         if (fn) resolve(fn(thisArg));
      } catch (error) {
         reject(error);
      }
   });
}



function graphOperationWorker(task: GraphOperation, done: done) {
   switch (task.type) {
      case 'addNodes':
         asyncify(addNewNodes, task.data as Node[]);
         break;
      case 'addLinks':
         asyncify(addNewLinks, task.data as Link[]);
         break;
      case 'removeNodes':
         asyncify(removeNodes, task.data as GraphData);
         break;
      case 'addBoth': {
         asyncify(addBoth, task.data as GraphData);
         break;
      }
      case 'addAll': {
         asyncify(addAll, task.data as GraphData);
         break;
      }
      default:
         console.error('Unsupported operation');
   }
   done(null);
}
const graphOperationQueue = fastq(graphOperationWorker, 1);


function enqueueGraphOperation(operation: GraphOperation) {
   graphOperationQueue.push(operation, (err) => {
      if (err) {
         console.error('Operation failed', err);
      } else {
         logger.log('Operation completed successfully');
      }
   });
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
   linksStore,
   newNodesStore,
   newLinksStore,
   articlesWithNodesAndLinksStore,
   focusedArticleId
}