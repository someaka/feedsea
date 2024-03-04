import { nodesToLinks } from '../components/graph/graph';

self.onmessage = async (event) => {
    self.postMessage( await nodesToLinks(
        event.data.nodes,
        event.data.newPairs
    ));
};