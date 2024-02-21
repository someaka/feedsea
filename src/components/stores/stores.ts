import { derived, writable, get } from 'svelte/store';
import queueNewArticles from '$lib/embedFetch'; //'$lib/embedTransformers';
import calculateAllPairs from '$lib/pairCalculator';
import { articlesToNodes, nodesToLinks } from '../graph/graph';
import { addNewLinks, addNewNodes, refreshRenderer, removeNodes } from '../graph/graphologySigma';

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

const graphData: GraphData = { nodes: [], links: [] };

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


const graphDataStore = derived(
   [nodesStore, linksStore],
   ([$nodesStore, $linksStore], set) => {
      const graphData: GraphData = { nodes: $nodesStore.nodes, links: $linksStore.links };
      set(graphData);
   },
   graphData
);







const newNodesStore = derived(
   [nodesStore],
   ([$nodesStore], set) => {
      const selectedFeedIds = get(selectedFeedsStore).feedIds;

      const selectedArticleIds: string[] = [];
      selectedFeedIds.forEach(feedId => {
         const articlesForFeed = articleCache[feedId];
         if (articlesForFeed) {
            articlesForFeed.forEach(article => selectedArticleIds.push(article.id));
         }
      });

      const nodes = $nodesStore.newNodes.filter(
         node =>
            selectedArticleIds.includes(node.id)
      );

      //addNewNodes(nodes);
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
      const selectedFeedIds = get(selectedFeedsStore).feedIds;

      const selectedArticleIds: string[] = [];
      selectedFeedIds.forEach(feedId => {
         const articlesForFeed = articleCache[feedId];
         if (articlesForFeed) {
            articlesForFeed.forEach(article => selectedArticleIds.push(article.id));
         }
      });

      const links = $linksStore.newLinks.filter(
         link =>
            selectedArticleIds.includes(link.source.id) &&
            selectedArticleIds.includes(link.target.id)
      );

      //addNewLinks(links);
      enqueueGraphOperation({ type: 'addLinks', data: links });
      queueRefreshRenderer();

      logger.log("Links Added");

      set(links);
   },
   [] as Link[]
);

const articlesWithNodesAndLinksStore = derived(
   [selectedFeedsStore],
   ([$selectedFeedsStore], set) => {
      if (!$selectedFeedsStore.change || $selectedFeedsStore.change.type === 'new') return;
      const articles = get(articlesStore);
      const nodes = get(nodesStore).nodes;
      const links = get(linksStore).links;
      ;

      if ($selectedFeedsStore.change.type === 'add') {
         const articlesToAdd = articles[$selectedFeedsStore.change.feedId];
         if (!articlesToAdd) return;
         const articleIdsSet = new Set(articlesToAdd.map(article => article.id));
         const newNodes = nodes.filter(node => articleIdsSet.has(node.id));
         const nodeIds = new Set(newNodes.map(node => node.id));
         const newLinks = links.filter(link =>
            nodeIds.has(link.source.id) || nodeIds.has(link.target.id)
         );
         enqueueGraphOperation({ type: 'addBoth', data: { nodes: newNodes, links: newLinks } });
         queueRefreshRenderer();
      }

      if ($selectedFeedsStore.change.type === 'remove') {
         const feedsToGet = $selectedFeedsStore.feedIds;
         const articlesToRemove = articles[$selectedFeedsStore.change.feedId];
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
      }

      if ($selectedFeedsStore.change.type === 'all') {
         const feedsToGet = $selectedFeedsStore.feedIds;
         const articlesToAdd = Array.from(feedsToGet).flatMap(feedId => articles[feedId] || []);
         if (!articlesToAdd) return;
         const articleIdsSet = new Set(articlesToAdd.map(article => article.id));
         const newNodes = nodes.filter(node => articleIdsSet.has(node.id));
         const nodeIds = new Set(newNodes.map(node => node.id));
         const newLinks = links.filter(link =>
            nodeIds.has(link.source.id) || nodeIds.has(link.target.id)
         );
         enqueueGraphOperation({ type: 'addBoth', data: { nodes: newNodes, links: newLinks } });
         queueRefreshRenderer();
      }

      set({ nodes, links });
   },
   { nodes: [], links: [] } as GraphData
);


let lastScheduledCall = 0;
const minimumInterval = 5000;

function queueRefreshRenderer() {
   const now = performance.now();
   const timeUntilNextAllowedCall = lastScheduledCall + minimumInterval - now;

   if (timeUntilNextAllowedCall <= 0) {
      scheduleRefresh(now);
   } else {
      if (!lastScheduledCall || now > lastScheduledCall) {
         setTimeout(() => scheduleRefresh(performance.now()), timeUntilNextAllowedCall);
      }
   }
}

function scheduleRefresh(timestamp: number) {
   lastScheduledCall = timestamp;
   requestAnimationFrame(() => {
      refreshRenderer();
   });
}












import fastq from 'fastq';
import type { done } from 'fastq';

interface GraphOperation {
   type: 'addNodes' | 'addLinks' | 'addBoth' | 'removeNodes';
   data: Node[] | Link[] | GraphData
}

function graphOperationWorker(task: GraphOperation, done: done) {
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
         const { nodes, links } = task.data as GraphData;
         addNewNodes(nodes);
         addNewLinks(links);
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
   graphDataStore,
   newNodesStore,
   newLinksStore,
   articlesWithNodesAndLinksStore,
   focusedArticleId
}