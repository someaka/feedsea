import type { ArticleType, Link, Node } from "./types";
import type {
    AddLinkOperationData,
    AddNodesOperationData,
    AllSelectedOperationData,
    OperationData
} from '$lib/graphTypes';


self.addEventListener('message', (event) => {
    const task = event.data;

    switch (task.type) {
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
    let selectedArticleIdsSet: Set<string> | null = new Set<string>();
    data.feedIds.forEach((feedId: string | number) =>
        data.articles[feedId]?.forEach((article: { id: string; }) =>
            (selectedArticleIdsSet as Set<string>).add(article.id))
    );
    let articlesToAdd: ArticleType[] | null = data.articles[data.newFeedId];
    if (articlesToAdd) {
        let articleIdsSet: Set<string> | null =
            new Set(articlesToAdd.map((article: { id: string; }) => article.id));
        let newNodes: Node[] | null = data.nodes.filter((node: Node) => (articleIdsSet as Set<string>).has(node.id));
        let newLinks: Link[] | null = data.links.filter((link: Link) =>
            ((articleIdsSet as Set<string>).has(link.source)
                && (selectedArticleIdsSet as Set<string>).has(link.target))
            ||
            ((selectedArticleIdsSet as Set<string>).has(link.source)
                && (articleIdsSet as Set<string>).has(link.target))
        );
        self.postMessage({
            type: 'GRAPH_BOTH',
            data: { nodes: newNodes, links: newLinks }
        });
        newLinks = null;
        newNodes = null;
        articleIdsSet = null;
        articlesToAdd = null;
        selectedArticleIdsSet = null;
    }
}

function queueRemoveSelectedNodes(data: OperationData) {
    let feedsToGet: Set<number> | null = data.feedIds;
    let articlesToRemove: ArticleType[] | null = data.articles[data.newFeedId];
    let articlesToAdd: ArticleType[] | null =
        Array.from((feedsToGet as Set<number>)).flatMap(feedId => data.articles[feedId] || []);
    if (!articlesToAdd || !articlesToRemove) return;
    let articleIdsSet: Set<string> | null = new Set(articlesToAdd.map(article => article.id));
    let newNodes: Node[] | null = data.nodes.filter(node => (articleIdsSet as Set<string>).has(node.id));
    let nodeIds: Set<string> | null = new Set(newNodes.map(node => node.id));
    let newLinks: Link[] | null = data.links.filter(link =>
        (nodeIds as Set<string>).has(link.source) && (nodeIds as Set<string>).has(link.target)
    );
    let removeIdsSet: Set<string> | null = new Set(articlesToRemove.map(article => article.id));
    let nodesToRemove: Node[] | null = data.nodes.filter(node => (removeIdsSet as Set<string>).has(node.id));
    self.postMessage({
        type: 'GRAPH_REMOVE',
        data: { nodes: nodesToRemove, links: newLinks }
    });
    nodesToRemove = null;
    newLinks = null;
    newNodes = null;
    removeIdsSet = null;
    nodeIds = null;
    articleIdsSet = null;
    articlesToAdd = null;
    articlesToRemove = null;
    feedsToGet = null;
}

function queueAllSelectedNodes(data: AllSelectedOperationData) {
    let articleIdsSet: Set<string> | null = new Set((data.articles).flatMap(article => article.id));
    let newNodes: Node[] | null = data.nodes.filter(node => (articleIdsSet as Set<string>).has(node.id));
    let nodeIds: Set<string> | null = new Set(newNodes.map(node => node.id));
    let newLinks: Link[] | null = data.links.filter(link =>
        (nodeIds as Set<string>).has(link.source)
        && (nodeIds as Set<string>).has(link.target)
    );
    self.postMessage({
        type: 'GRAPH_ALL',
        data: { nodes: newNodes, links: newLinks }
    });
    newNodes = null;
    nodeIds = null;
    newLinks = null;
    articleIdsSet = null;
}

async function queueAddNewLinks(data: AddLinkOperationData) {
    let selectedArticleIds: Set<string> | null = new Set<string>();
    data.feedIds.forEach(feedId => {
        const articlesForFeed = data.articles[feedId];
        if (articlesForFeed) articlesForFeed.forEach(article =>
            (selectedArticleIds as Set<string>).add(article.id));
    });
    let filteredLinks: Link[] | null = data.newLinks.filter(link =>
        (selectedArticleIds as Set<string>).has(link.source)
        && (selectedArticleIds as Set<string>).has(link.target)
    );

    self.postMessage({
        type: 'GRAPH_LINKS',
        data:  filteredLinks
    });
    filteredLinks = null;
    selectedArticleIds = null;
}

function queueAddNewNodes(data: AddNodesOperationData) {
    let selectedArticleIds: Set<string> | null = new Set<string>();
    data.feedIds.forEach(feedId => {
        const articlesForFeed = data.articles[feedId];
        if (articlesForFeed) articlesForFeed.forEach(article =>
            (selectedArticleIds as Set<string>).add(article.id));
    });
    let filteredNodes: Node[] | null = data.newNodes.filter(node =>
        (selectedArticleIds as Set<string>).has(node.id)
    );

    self.postMessage({
        type: 'GRAPH_NODES',
        data:  filteredNodes
    });
    filteredNodes = null;
    selectedArticleIds = null;
}