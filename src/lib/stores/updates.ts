import { get } from 'svelte/store';
import queueArticlesToNodes from './articlesToNodes';
import queueNewArticles from '$lib/embedFetch';
import calculateAllPairs from '$lib/pairCalculator';
import queueNodesToLinks from './nodesToLinks';
import {
    addAll,
    addBoth,
    addNewLinks,
    addNewNodes,
    clearGraph,
    removeNodesById,
} from '../../components/graph/SigmaGraphUpdate';
import {
    embeddingsStore,
    selectedFeedsStore,
    pairsStore,
    nodesStore,
    linksStore,
    selectedArticleIds,
    articleIdsStore,
} from './stores';

import type {
    ArticleType as Article,
    EmbeddingsState,
    SelectedFeedsState,
    PairsState,
    NodeUpdate,
    LinkUpdate,
    Node, Link
} from '$lib/types';
import type {
    GraphOperation,
    OperationData
} from '$lib/graphTypes';



function queueAddBoth(data: OperationData) {
    const selectedArticleIdsSet = get(selectedArticleIds);
    const latestArticleIdsSet = get(articleIdsStore)[data.newFeedId];
    addBoth({
        nodes: get(nodesStore).nodes.filter(node => latestArticleIdsSet.has(node.id)),
        links: get(linksStore).links.filter(link =>
            (latestArticleIdsSet.has(link.source) && selectedArticleIdsSet.has(link.target)) ||
            (selectedArticleIdsSet.has(link.source) && latestArticleIdsSet.has(link.target)))
    });
}

function queueRemoveSelectedNodes(data: OperationData) {
    // const feedIdToRemove = data.newFeedId;
    const articleIdsSetToRemove = get(articleIdsStore)[data.newFeedId];
    // const nodesToRemove = get(nodesStore).nodes.filter(node => articleIdsSetToRemove.has(node.id));
    // const selectedArticleIdsSet = get(selectedArticleIds);
    // const linksToReAdd = get(linksStore).links.filter(link =>
    //     selectedArticleIdsSet.has(link.target) && selectedArticleIdsSet.has(link.source)
    // );
    removeNodesById(articleIdsSetToRemove,
        //linksToReAdd
    );
}


function queueAllSelectedNodes(data: { articles: Set<string> }) {
    addAll({
        nodes: get(nodesStore).nodes.filter(node =>
            (data.articles as Set<string>).has(node.id)),
        links: get(linksStore).links
    });
}

async function queueAddNewLinks(data: Link[]) {
    const selectedArticleIdsSet = get(selectedArticleIds);
    const newLinks = data.filter(link =>
        selectedArticleIdsSet.has(link.source)
        && selectedArticleIdsSet.has(link.target))
    if (newLinks.length > 0) addNewLinks(newLinks);
}

function queueAddNewNodes(data: Node[]) {
    const selectedArticleIdsSet = get(selectedArticleIds);
    const newNodes = data.filter(node => selectedArticleIdsSet.has(node.id))
    if (newNodes.length > 0) addNewNodes(newNodes);
}

function queueClear() {
    clearGraph();
}

async function enqueueGraphOperation(task: GraphOperation) {
    switch (task.type) {
        case 'clearGraph':
            queueClear();
            break;
        case 'addNodes':
            queueAddNewNodes(task.data as Node[]);
            break;
        case 'addLinks':
            queueAddNewLinks(task.data as Link[]);
            break;
        case 'removeNodes':
            queueRemoveSelectedNodes(task.data as OperationData);
            break;
        case 'addBoth':
            queueAddBoth(task.data as OperationData);
            break;
        case 'addAll':
            queueAllSelectedNodes(task.data as { articles: Set<string> });
            break;
        default:
            console.error('Unsupported operation');
    }
}


embeddingsStore.subscribe(($embeddingsStore: EmbeddingsState) =>
    calculateAllPairs($embeddingsStore));

pairsStore.subscribe(($pairsStore: PairsState) =>
    queueNodesToLinks(
        get(nodesStore).nodes.map(
            node => ({
                id: node.id,
                color: node.color
            })
        ),
        $pairsStore.newPairs)
);

nodesStore.subscribe(($nodesStore: NodeUpdate) =>
    enqueueGraphOperation({
        type: 'addNodes',
        data: $nodesStore.newNodes
    })
);

linksStore.subscribe(($linksStore: LinkUpdate) =>
    enqueueGraphOperation({
        type: 'addLinks',
        data: $linksStore.newLinks
    })
);


selectedFeedsStore.subscribe(($selectedFeedsStore: SelectedFeedsState) => {
    if (!$selectedFeedsStore.change) return;
    if ($selectedFeedsStore.change.type === 'new')
        return newArticlesToNodes(
            $selectedFeedsStore.change.articles as Article[]
        );

    switch ($selectedFeedsStore.change.type) {
        case 'add':
            enqueueGraphOperation({
                type: 'addBoth',
                data: {
                    feedIds: $selectedFeedsStore.feedIds,
                    newFeedId: $selectedFeedsStore.change.feedId
                }
            });
            break;
        case 'remove':
            enqueueGraphOperation({
                type: 'removeNodes',
                data: {
                    feedIds: $selectedFeedsStore.feedIds,
                    newFeedId: $selectedFeedsStore.change.feedId
                }
            });
            break;
        case 'all':
            enqueueGraphOperation({
                type: 'addAll',
                data: {
                    articles: $selectedFeedsStore.change.articles as Set<string>
                }
            });
            break;
    }

});

function newArticlesToNodes(articles: Article[] | undefined) {
    if (!articles) return;
    queueNewArticles(articles);
    queueArticlesToNodes(
        articles.map(({ id, feedColor, title }) => ({ id, feedColor, title }))
    );
}

export default enqueueGraphOperation