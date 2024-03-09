import { linksStore } from './stores';
import type { Pair } from '$lib/types';

let linksWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;
let LinksWorkerModule: typeof import('$lib/linksWorker?worker') | null = null;
const TIMEOUT_INTERVAL = 60 * 1000;

async function initLinksWorker(): Promise<Worker> {
    if (!linksWorker) {
        if (!LinksWorkerModule)
            LinksWorkerModule = await import('$lib/linksWorker?worker');
        linksWorker = new LinksWorkerModule.default();
        linksWorker.onmessage = (event) => {
            const newLinks = event.data;
            if (Object.values(newLinks).length > 0)
                linksStore.update(currentLinks => {
                    Object.assign(currentLinks.links, newLinks);
                    currentLinks.newLinks = newLinks;
                    return currentLinks;
                });
            // resetWorkerIdleTimeout();
        };

        linksWorker.onerror = (error) =>
            console.error('Links Worker error:', error);
    }
    return linksWorker;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(terminateLinksWorker, TIMEOUT_INTERVAL);
}
function terminateLinksWorker() {
    if (linksWorker) {
        linksWorker.terminate();
        linksWorker = null;
    }
}

async function postMessageToLinkWorker(
    nodes: {id: string,color: string}[], newPairs: Record<string, Pair>
) {
    linksWorker = await initLinksWorker();
    // clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    linksWorker.postMessage({ nodes, newPairs });
}
async function queueNodesToLinks(nodes: {id: string,color: string}[], newPairs: Record<string, Pair>) {
    await postMessageToLinkWorker(nodes, newPairs);
}

export default queueNodesToLinks;