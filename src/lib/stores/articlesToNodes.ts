import { nodesStore } from './stores';
import type { Node, ArticleType as Article } from '$lib/types';

let nodesWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (nodesWorker) {
            nodesWorker.terminate();
            nodesWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

async function initNodesWorker(): Promise<Worker> {
    if (nodesWorker) return nodesWorker;

    const NodesWorkerModule = await import('$lib/nodesWorker?worker');
    nodesWorker = new NodesWorkerModule.default();

    nodesWorker.onmessage = (event: MessageEvent<Node[]>) => {
        const newNodes = event.data;
        nodesStore.update(currentNodes => {
            newNodes.forEach((node: Node) =>
                currentNodes.nodes.push(node));
            currentNodes.newNodes = newNodes;
            return currentNodes;
        });
        resetWorkerIdleTimeout();
    };

    nodesWorker.onerror = (error) => {
        console.error('Nodes Worker error:', error);
    };

    return nodesWorker;
}

async function queueArticlesToNodes(articles: Article[]) {
    nodesWorker = await initNodesWorker();
    clearTimeout(idleTimeout);
    nodesWorker.postMessage(articles);
}

export default queueArticlesToNodes;