import { get } from 'svelte/store';
import queueArticlesToNodes from './articlesToNodes';
import { queueNewArticles, initEmbedFetchWorker } from '$lib/embedFetch';
import { calculateAllPairs, initializePairWorker as initPairWorker } from '$lib/pairCalculator';
import { queueNodesToLinks, initLinksWorker } from './nodesToLinks';
import {
    addAll,
    addBoth,
    addNewLinks,
    addNewNodes,
    clearGraph,
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



let graphWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
let graphWorkerPromise: Promise<Worker> | null = null;

function initializeGraphWorker() {
    if (!graphWorkerPromise) {
        graphWorkerPromise = import('$lib/graphWorker?worker').then(module => {
            graphWorker = new module.default();
            graphWorker.onmessage = (event) => {

                switch (event.data.type) {
                    case 'GRAPH_CLEAR':
                        queueClear();
                        break;
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
                resetWorkerIdleTimeout();
            };

            graphWorker.onerror = (error) => {
                console.error('Graph Worker error:', error);
            };
            return graphWorker;
        });
    }
    return graphWorkerPromise;
}

function queueClear() {
    clearGraph();
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (graphWorker) {
            graphWorker.terminate();
            graphWorker = null;
            graphWorkerPromise = null;
        }
    }, 10000);
}

async function postMessageToGraphWorker(operation: GraphOperation) {
    graphWorker = await initializeGraphWorker();
    clearTimeout(idleTimeout);
    graphWorker.postMessage(operation);
}

async function enqueueGraphOperation(operation: GraphOperation) {
    await postMessageToGraphWorker(operation);
}

initEmbedFetchWorker();
initPairWorker();
initLinksWorker();

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
    queueArticlesToNodes(articles);
    // let newNodes: Node[] | null = articlesToNodes(articles);
    // nodesStore.update((currentNodes) => {
    //     (newNodes as Node[]).forEach(node => currentNodes.nodes.push(node))
    //     currentNodes.newNodes = newNodes as Node[];
    //     return currentNodes;
    // });
    // newNodes = null;
}

export default enqueueGraphOperation