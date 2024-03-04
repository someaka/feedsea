// import { graphStore } from './stores/stores';
// import type { GraphState, Link, Pair } from '$lib/types';
// import { get } from 'svelte/store';
// import type Graph from 'graphology';

// let currentWorkerIndex = 0;
// let graphOperationsWorkers: Worker[] = [];

// async function initGraphOperationsWorkers(): Promise<void> {
//     const numCPUs = //navigator.hardwareConcurrency || 
//         1;
//     for (let i = 0; i < Math.max(1, numCPUs - 1); i++) {
//         const GraphOperationsWorkerModule = await import('$lib/graphOperationsWorker?worker');
//         const worker = new GraphOperationsWorkerModule.default();
//         worker.onmessage = handleWorkerMessage;
//         worker.onerror = handleWorkerError;
//         graphOperationsWorkers.push(worker);
//     }
// }

// function handleWorkerMessage(event: MessageEvent) {
//     const { links } = event.data;
//     graphStore.update(graphState => {
//         graphState.task = 'links';
//         graphState.newLinks = new Set();
//         addNewLinks(links, graphState);
//         return graphState;
//     });
// }

// function handleWorkerError(error: ErrorEvent) {
//     console.error('Graph Operations Worker error:', error);
// }

// function addNewLinks(links: Link[], graphState: GraphState) {
//     for (const link of links) {
//         const sourceId = link.source;
//         const targetId = link.target;
//         const edgeKey = `${sourceId}_${targetId}`;
//         graphState.newLinks.add(edgeKey);
//         graphState.graph.addEdgeWithKey(edgeKey, sourceId, targetId, {
//             weight: link.weight || 1,
//             color: link.day_color,
//             day_color: link.day_color,
//             night_color: link.night_color
//         });
//     }
// }

// async function queueNodesToLinks(newPairs: Record<string, Pair>) {
//     let graph: Graph | null = get(graphStore).graph;
//     if (!graph) {
//         console.error('Graph is not initialized');
//         return;
//     }

//     const nodesWithColorRecord: Record<string, string> = {};
//     graph.forEachNode((node, attributes) => {
//         nodesWithColorRecord[node] = attributes.color;
//     });
//     graph = null;
//     distributeWork(newPairs, nodesWithColorRecord);
// }

// function distributeWork(newPairs: Record<string, Pair>, nodesWithColorRecord: Record<string, string>) {
//     if (graphOperationsWorkers.length === 0) {
//         console.error('No graph operations workers initialized.');
//         return;
//     }

//     const worker = graphOperationsWorkers[currentWorkerIndex];
//     worker.postMessage({ newPairs, nodesWithColorRecord });

//     currentWorkerIndex = (currentWorkerIndex + 1) % graphOperationsWorkers.length;
// }

// function terminateWorkers() {
//     graphOperationsWorkers.forEach(worker => worker.terminate());
//     graphOperationsWorkers = [];
// }

// initGraphOperationsWorkers();

// export default queueNodesToLinks;
// export { terminateWorkers, addNewLinks };