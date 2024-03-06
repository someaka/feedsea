import { linksStore } from './stores';
import type { Node, Pair } from '$lib/types';

let linksWorker: Worker;

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
    };

    linksWorker.onerror = (error) => {
        console.error('Links Worker error:', error);
    };

    return linksWorker;
}



async function queueNodesToLinks(nodes: Node[], newPairs: Record<string, Pair>) {
    linksWorker = await initLinksWorker();
    linksWorker.postMessage({nodes, newPairs});
}

export default queueNodesToLinks