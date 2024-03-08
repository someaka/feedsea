import { linksStore } from './stores';
import type { Node, Pair } from '$lib/types';

let linksWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
const TIMEOUT_INTERVAL = 10000;

async function initLinksWorker(): Promise<Worker> {
    if (!linksWorker) {
        const LinksWorkerModule = await import('$lib/linksWorker?worker');
        linksWorker = new LinksWorkerModule.default();
        linksWorker.onmessage = (event) => {
            const newLinks = event.data;
            if (Object.values(newLinks).length > 0)
                linksStore.update(currentLinks => {
                    Object.assign(currentLinks.links, newLinks);
                    currentLinks.newLinks = newLinks;
                    return currentLinks;
                });
            resetWorkerIdleTimeout();
        };

        linksWorker.onerror = (error) =>
            console.error('Links Worker error:', error);
    }
    return linksWorker;
}

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        if (linksWorker) {
            linksWorker.terminate();
            linksWorker = null;
        }
    }, TIMEOUT_INTERVAL);
}

async function postMessageToLinkWorker(
    nodes: Node[], newPairs: Record<string, Pair>
) {
    linksWorker = await initLinksWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    linksWorker.postMessage({ nodes, newPairs });
}
async function queueNodesToLinks(nodes: Node[], newPairs: Record<string, Pair>) {
    await postMessageToLinkWorker(nodes, newPairs);
}

export default queueNodesToLinks;