import { linksStore } from './stores';
import type { Link, Node, Pair } from '$lib/types';

let linksWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;

const TIMEOUT_INTERVAL = 10000;

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout); // Clear any existing timeout
    idleTimeout = setTimeout(() => {
        if (linksWorker) {
            linksWorker.terminate(); // Terminate the worker if idle for 10 seconds
            linksWorker = null; // Clear the reference to the terminated worker
        }
    }, TIMEOUT_INTERVAL); // 10 seconds
}

async function initLinksWorker(): Promise<Worker> {
    if (linksWorker) return linksWorker;

    const NodesWorkerModule = await import('$lib/linksWorker?worker');
    linksWorker = new NodesWorkerModule.default();

    linksWorker.onmessage = (event) => {
        const newLinks = event.data;
        linksStore.update(currentLinks => {
            newLinks.forEach((link: Link) =>  currentLinks.links.push(link));
            currentLinks.newLinks = newLinks;
            return currentLinks;
        });
        resetWorkerIdleTimeout(); // Reset the timeout after a task is completed
    };

    linksWorker.onerror = (error) => {
        console.error('Links Worker error:', error);
    };

    return linksWorker;
}

async function queueNodesToLinks(nodes: Node[], newPairs: Record<string, Pair>) {
    linksWorker = await initLinksWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    linksWorker.postMessage({ nodes, newPairs });
}

export { queueNodesToLinks, initLinksWorker };