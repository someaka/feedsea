import { linksStore } from './stores';
import type { Node, Pair } from '$lib/types';

let linksWorker: Worker | null = null;
let idleTimeout: ReturnType<typeof setTimeout>;

function resetWorkerIdleTimeout() {
    clearTimeout(idleTimeout); // Clear any existing timeout
    idleTimeout = setTimeout(() => {
        if (linksWorker) {
            linksWorker.terminate(); // Terminate the worker if idle for 10 seconds
            linksWorker = null; // Clear the reference to the terminated worker
        }
    }, 10000); // 10 seconds
}

export async function initLinksWorker(): Promise<Worker> {
    if (linksWorker) return linksWorker;

    const NodesWorkerModule = await import('$lib/linksWorker?worker');
    linksWorker = new NodesWorkerModule.default();

    linksWorker.onmessage = (event) => {
        const newLinks = event.data;
        linksStore.update(currentLinks => {
            const links = currentLinks.links.concat(newLinks);
            return { links, newLinks };
        });
        resetWorkerIdleTimeout(); // Reset the timeout after a task is completed
    };

    linksWorker.onerror = (error) => {
        console.error('Links Worker error:', error);
    };

    // No need to set the timeout when the worker is initialized, as it's not idle yet
    return linksWorker;
}

async function queueNodesToLinks(nodes: Node[], newPairs: Record<string, Pair>) {
    linksWorker = await initLinksWorker();
    clearTimeout(idleTimeout); // Clear the timeout when a new task starts
    linksWorker.postMessage({nodes, newPairs});
    // Do not reset the timeout here; wait for the task to complete
}

export default queueNodesToLinks;