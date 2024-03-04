import { nodesToLinks } from '../components/graph/graph';
import type { Link } from './types';

self.onmessage = (event) => {
    let links: Link[] | null = nodesToLinks(
        event.data.newPairs,
        event.data.nodesWithColorRecord
    );
    self.postMessage({ links });
    links = null;
};