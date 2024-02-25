
import { nodesStore } from '../components/stores/stores';
import type { Node, ArticleType as Article } from '$lib/types';

let nodesWorker: Worker;

async function initNodesWorker(): Promise<Worker> {
    if (nodesWorker) return nodesWorker;

    const NodesWorkerModule = await import('$lib/nodesWorker?worker');
    nodesWorker = new NodesWorkerModule.default();

    nodesWorker.onmessage = (event: MessageEvent<Node[]>) => {
        const newNodes = event.data;
        nodesStore.update(currentNodes =>
            ({ nodes: [...currentNodes.nodes, ...newNodes], newNodes })
        );
    };

    nodesWorker.onerror = (error) => {
        console.error('Nodes Worker error:', error);
    };

    return nodesWorker;
}

initNodesWorker();

function queueArticlesToNodes(articles: Article[]) {
    nodesWorker.postMessage(articles);
}

export default queueArticlesToNodes