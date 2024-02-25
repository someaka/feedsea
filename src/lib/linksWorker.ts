import { nodesToLinks } from '../components/graph/graph';

self.onmessage = (event) => {
    const { nodes, newPairs } = event.data;
    const newLinks = nodesToLinks(nodes, newPairs);
    self.postMessage(newLinks);
};