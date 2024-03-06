import { get } from 'svelte/store';
import queueNewArticles from '$lib/embedFetch';
import calculateAllPairs, { initPairWorker } from '$lib/pairCalculator';
import {
    addAll,
    addBoth,
    addNewLinks,
    addNewNodes,
    removeNodesById,
} from '../../components/graph/SigmaGraphUpdate';
import {
    articlesStore,
    embeddingsStore,
    selectedFeedsStore,
    pairsStore,
    nodesStore,
    linksStore,
} from './stores';

import type {
    ArticleType as Article,
    EmbeddingsState,
    SelectedFeedsState,
    PairsState,
    Node,
    Link,
    NodeUpdate,
    LinkUpdate,
} from '$lib/types';
import type { GraphOperation } from '$lib/graphTypes';
import { articlesToNodes } from '../../components/graph/graph';
import queueNodesToLinks, { initLinksWorker } from './nodesToLinks';


let graphWorker: Worker | null = null;
let graphWorkerPromise: Promise<Worker> | null = null;
initPairWorker();
initLinksWorker();

async function initGraphWorker(): Promise<Worker> {
    if (graphWorker !== null) {
        return graphWorker;
    }
    if (graphWorkerPromise === null) {
        graphWorkerPromise = (async () => {
            const GraphWorkerModule = await import('$lib/graphWorker?worker');
            graphWorker = new GraphWorkerModule.default();
            graphWorker.onmessage = (event) => {
                switch (event.data.type) {
                    case 'GRAPH_LINKS': 
                        addNewLinks(event.data.data);
                        break;
                    case 'GRAPH_NODES': 
                        addNewNodes(event.data.data);
                        break;                    
                    case 'GRAPH_REMOVE':
                        removeNodesById(event.data.data);
                        break;
                    case 'GRAPH_BOTH':
                        addBoth(event.data.data);
                        break;
                    case 'GRAPH_ALL':
                        addAll(event.data.data);
                        break;
                }
            };
            graphWorker.onerror = (error) => {
                console.error('Graph Worker error:', error);
            };
            return graphWorker;
        })();
    }
    return graphWorkerPromise;
}

async function enqueueGraphOperation(operation: GraphOperation) {
    graphWorker = await initGraphWorker();
    graphWorker.postMessage(operation);
}


embeddingsStore.subscribe(($embeddingsStore: EmbeddingsState) => {
    if (Object.keys($embeddingsStore.embeddings).length > 0)
        calculateAllPairs($embeddingsStore);
});

pairsStore.subscribe(($pairsStore: PairsState) => {
    if (Object.keys($pairsStore.newPairs).length > 0)
        queueNodesToLinks(get(nodesStore).nodes, $pairsStore.newPairs);
});

nodesStore.subscribe(($nodesStore: NodeUpdate) => {
    enqueueGraphOperation({
        type: 'addNodes',
        data: {
            newNodes: $nodesStore.newNodes,
            feedIds: get(selectedFeedsStore).feedIds,
            articles: get(articlesStore)
        }
    });
});

linksStore.subscribe(($linksStore: LinkUpdate) => {
    enqueueGraphOperation({
        type: 'addLinks',
        data: {
            newLinks: $linksStore.newLinks,
            feedIds: get(selectedFeedsStore).feedIds,
            articles: get(articlesStore)
        }
    });
});


selectedFeedsStore.subscribe(($selectedFeedsStore: SelectedFeedsState) => {
    if (!$selectedFeedsStore.change) return;
    if ($selectedFeedsStore.change.type === 'new')
        return newArticlesToNodes($selectedFeedsStore.change.articles);

    let articles: Record<string, Article[]> | null =
        get(articlesStore);
    let nodes: Node[] | null = get(nodesStore).nodes;
    let links: Link[] | null = get(linksStore).links;

    switch ($selectedFeedsStore.change.type) {
        case 'add':
            enqueueGraphOperation({
                type: 'addBoth',
                data: {
                    feedIds: $selectedFeedsStore.feedIds,
                    newFeedId: $selectedFeedsStore.change.feedId,
                    articles,
                    nodes,
                    links
                }
            });
            break;
        case 'remove':
            enqueueGraphOperation({
                type: 'removeNodes',
                data: {
                    feedIds: $selectedFeedsStore.feedIds,
                    newFeedId: $selectedFeedsStore.change.feedId,
                    articles,
                    nodes,
                    links
                }
            });
            break;
        case 'all':
            enqueueGraphOperation({
                type: 'addAll',
                data: {
                    articles: $selectedFeedsStore.change.articles,
                    nodes,
                    links
                }
            });
            break;
    }
    articles = null;
    nodes = null;
    links = null;
});

function newArticlesToNodes(articles: Article[] | undefined) {
    if (!articles) return;
    queueNewArticles(articles);
    const newNodes = articlesToNodes(articles);
    nodesStore.update((currentNodes) => {
        const nodes = currentNodes.nodes.concat(newNodes);
        return { nodes, newNodes };
    });
}

export default enqueueGraphOperation