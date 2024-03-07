import { linksStore } from './stores';
import type { Link, Node, Pair } from '$lib/types';

let linksWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;

const TIMEOUT_INTERVAL = 10000;

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (linksWorker) {
            linksWorker.terminate();
            linksWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

async function initLinksWorker(): Promise<Worker> {
    if (linksWorker) return linksWorker;

    const NodesWorkerModule = await import('$lib/linksWorker?worker');
    linksWorker = new NodesWorkerModule.default();

    linksWorker.onmessage = (event) => {
        const newLinks = event.data;
        linksStore.update(currentLinks => {
            newLinks.forEach((link: Link) =>
                currentLinks.links.push(link));
            currentLinks.newLinks = newLinks;
            return currentLinks;
        });
        resetWorkerIdleTimeout();
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