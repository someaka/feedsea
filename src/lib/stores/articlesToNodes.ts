import { nodesStore } from './stores';
import type { Node, ArticleType as Article } from '$lib/types';

const TIMEOUT_INTERVAL = 60 * 1000;
let idleTimeout: ReturnType<typeof setTimeout>;
let nodesWorker: Worker | null = null;
let workerInitializationPromise: Promise<Worker> | null = null;

async function initNodesWorker(): Promise<Worker> {
    if (nodesWorker) {
        return nodesWorker;
    } else if (workerInitializationPromise) {
        // Wait for the ongoing initialization to complete
        return workerInitializationPromise;
    } else {
        // Start a new initialization
        workerInitializationPromise = (async () => {
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
                // resetWorkerIdleTimeout();
            };
            nodesWorker.onerror = (error) =>
                console.error('Nodes Worker error:', error);
            return nodesWorker;
        })();
        const worker = await workerInitializationPromise;
        workerInitializationPromise = null; // Reset for future initializations
        return worker;
    }
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (nodesWorker) {
            nodesWorker.terminate();
            nodesWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

async function queueArticlesToNodes(articles: Article[]) {
    nodesWorker = await initNodesWorker();
    clearTimeout(idleTimeout);
    nodesWorker.postMessage(articles);
}

export default queueArticlesToNodes;