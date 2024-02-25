
import { linksStore } from '../components/stores/stores';
import type { Node, Pair } from '$lib/types';

let linksWorker: Worker;

async function initLinksWorker(): Promise<Worker> {
    if (linksWorker) return linksWorker;

    const NodesWorkerModule = await import('$lib/linksWorker?worker');
    linksWorker = new NodesWorkerModule.default();

    linksWorker.onmessage = (event) => {
        const newLinks = event.data;
        linksStore.update(currentLinks =>
            ({ links: [...currentLinks.links, ...newLinks], newLinks })
        );
    };

    linksWorker.onerror = (error) => {
        console.error('Links Worker error:', error);
    };

    return linksWorker;
}

initLinksWorker();

function queueNodesToLinks(nodes: Node[], newPairs: Record<string, Pair>) {
    linksWorker.postMessage({nodes, newPairs});
}

export default queueNodesToLinks