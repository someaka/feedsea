import { get } from 'svelte/store';
import queueArticlesToNodes from './articlesToNodes';
import queueNewArticles from '$lib/updates/embedFetch';
import calculateAllPairs from '$lib/updates/pairCalculator';
import queueNodesToLinks from './nodesToLinks';
import {
    addAll,
    addBoth,
    addNewLinks,
    addNewNodes,
    clearGraph,
    redrawLinks,
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
    linksPercentile,
} from '../stores/stores';

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
import { quickSelect } from '../../components/graph/graph';


linksPercentile.subscribe(percentile => {
    const selectedArticleIdsSet = get(selectedArticleIds);
    if (selectedArticleIdsSet.size === 0) return;
    const threshold = getPercentileThreshold(percentile);
    const links = get(linksStore).links
        .filter(link => link.weight > threshold)
        .filter(link => selectedArticleIdsSet.has(link.source
            ) && selectedArticleIdsSet.has(link.target));
    redrawLinks(links);
})

function getPercentileThreshold( percentile : number | undefined = undefined) {
    let similarities: number[] | null =
        Object.values(get(pairsStore).pairs).map(pair => pair.similarity);
    if(!percentile) percentile = get(linksPercentile)
    if (similarities.length === 0 || percentile === 1) return 1;
    const thresholdIndex = Math.floor(similarities.length * percentile);
    const threshold = quickSelect(similarities, thresholdIndex + 1);
    similarities = null;
    return threshold;
}

function queueAddBoth(data: OperationData) {
    const selectedArticleIdsSet = get(selectedArticleIds);
    const latestArticleIdsSet = get(articleIdsStore)[data.newFeedId];
    const threshold = getPercentileThreshold();
    addBoth({
        nodes: get(nodesStore).nodes.filter(node => latestArticleIdsSet.has(node.id)),
        links: get(linksStore).links
            .filter(link => link.weight > threshold)
            .filter(link =>
                (latestArticleIdsSet.has(link.source) && selectedArticleIdsSet.has(link.target)) ||
                (selectedArticleIdsSet.has(link.source) && latestArticleIdsSet.has(link.target)))
    });
}

function queueRemoveSelectedNodes(data: OperationData) {
    removeNodesById(get(articleIdsStore)[data.newFeedId]);
}


function queueAllSelectedNodes(data: { articles: Set<string> }) {
    const threshold = getPercentileThreshold();
    addAll({
        nodes: get(nodesStore).nodes.filter(node =>
            (data.articles as Set<string>).has(node.id)),
        links: get(linksStore).links
            .filter(link => link.weight > threshold)
    });
}

async function queueAddNewLinks(data: Link[]) {
    const threshold = getPercentileThreshold();
    const selectedArticleIdsSet = get(selectedArticleIds);
    const newLinks = data
        .filter(link => link.weight > threshold)
        .filter(link =>
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
        articles.map(
            ({ id, feedColor, title, date }) => ({ id, feedColor, title, date })
        )
    );
}

export default enqueueGraphOperation