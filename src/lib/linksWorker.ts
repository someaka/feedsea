import { nodesToLinks } from '../components/graph/graph';

self.onmessage = (event) => {
    self.postMessage(nodesToLinks(
        event.data.nodes,
        event.data.newPairs
    ));
};