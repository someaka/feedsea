import type { Link, Node } from "./types";
import type {
    AddLinkOperationData,
    AddNodesOperationData,
    AllSelectedOperationData,
    OperationData
} from '$lib/graphTypes';


self.addEventListener('message', (event) => {
    const task = event.data;

    switch (task.type) {
        case 'clearGraph':
            self.postMessage({
                type: 'GRAPH_CLEAR'
            });
            break;
        case 'addNodes':
            queueAddNewNodes(task.data);
            break;
        case 'addLinks':
            queueAddNewLinks(task.data);
            break;
        case 'removeNodes':
            queueRemoveSelectedNodes(task.data);
            break;
        case 'addBoth':
            queueAddBoth(task.data);
            break;
        case 'addAll':
            queueAllSelectedNodes(task.data);
            break;
        default:
            console.error('Unsupported operation');
    }
});



function queueAddBoth(data: OperationData) {
    const selectedArticleIdsSet = new Set<string>();
    data.feedIds.forEach((feedId: string | number) =>
        data.articles[feedId]?.forEach((article: { id: string; }) =>
            selectedArticleIdsSet.add(article.id))
    );
    const articlesToAdd = data.articles[data.newFeedId];
    if (articlesToAdd) {
        const articleIdsSet = new Set(articlesToAdd.map((article: { id: string; }) => article.id));
        const newNodes = data.nodes.filter((node: Node) => articleIdsSet.has(node.id));
        const newLinks = data.links.filter((link: Link) =>
            (articleIdsSet.has(link.source) && selectedArticleIdsSet.has(link.target))
            ||
            (selectedArticleIdsSet.has(link.source) && articleIdsSet.has(link.target))
        );
        self.postMessage({
            type: 'GRAPH_BOTH',
            data: { nodes: newNodes, links: newLinks }
        });
    }
}

function queueRemoveSelectedNodes(data: OperationData) {
    const feedsToGet = data.feedIds;
    const articlesToRemove = data.articles[data.newFeedId];
    const articlesToAdd = Array.from(feedsToGet).flatMap(feedId => data.articles[feedId] || []);
    if (!articlesToAdd || !articlesToRemove) return;
    const articleIdsSet = new Set(articlesToAdd.map(article => article.id));
    const newNodes = data.nodes.filter(node => articleIdsSet.has(node.id));
    const nodeIds = new Set(newNodes.map(node => node.id));
    const newLinks = data.links.filter(link =>
        nodeIds.has(link.source) && nodeIds.has(link.target)
    );
    const removeIdsSet = new Set(articlesToRemove.map(article => article.id));
    const nodesToRemove = data.nodes.filter(node => removeIdsSet.has(node.id));
    self.postMessage({
        type: 'GRAPH_REMOVE',
        data: { nodes: nodesToRemove, links: newLinks }
    });
}

function queueAllSelectedNodes(data: AllSelectedOperationData) {
    const articleIdsSet = new Set((data.articles).flatMap(article => article.id));
    const newNodes = data.nodes.filter(node => articleIdsSet.has(node.id));
    const nodeIds = new Set(newNodes.map(node => node.id));
    const newLinks = data.links.filter(link =>
        nodeIds.has(link.source) && nodeIds.has(link.target)
    );
    self.postMessage({
        type: 'GRAPH_ALL',
        data: { nodes: newNodes, links: newLinks }
    });
}

function queueAddNewLinks(data: AddLinkOperationData) {
    const selectedArticleIds = new Set<string>();
    data.feedIds.forEach(feedId => {
        const articlesForFeed = data.articles[feedId];
        if (articlesForFeed) articlesForFeed.forEach(article =>
            selectedArticleIds.add(article.id));
    });
    const filteredLinks = data.newLinks.filter(link =>
        selectedArticleIds.has(link.source) && selectedArticleIds.has(link.target)
    );
    self.postMessage({ type: 'GRAPH_LINKS', data: filteredLinks });
}

function queueAddNewNodes(data: AddNodesOperationData) {
    const selectedArticleIds = new Set<string>();
    data.feedIds.forEach(feedId => {
        const articlesForFeed = data.articles[feedId];
        if (articlesForFeed) articlesForFeed.forEach(article =>
            selectedArticleIds.add(article.id));
    });
    const filteredNodes = data.newNodes.filter(node =>
        selectedArticleIds.has(node.id)
    );
    self.postMessage({ type: 'GRAPH_NODES', data: filteredNodes });
}