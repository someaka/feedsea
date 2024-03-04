import Graph from "graphology";
import type { Node, Link, GraphData } from '$lib/types';

class GraphManipulator {
    private DayOrNight: boolean;

    constructor() {
        this.DayOrNight = false;
    }

    getNodeAttributes(node: Node) {
        return {
            x: node.x,
            y: node.y,
            size: node.size,
            color: node.color,
            label: node.title,
            title: node.title,
        };
    }

    serializeAndSendGraph(graph: Graph) {
        self.postMessage({ type: 'GRAPH_UPDATE', data: graph.export() });
    }

    updateDayNight(isNightMode: boolean) {
        this.DayOrNight = !isNightMode;
    }

    removeNodesById(graphData: GraphData) {

        self.postMessage({ type: 'GRAPH_REMOVE', data: graphData });



        // const graph = new Graph();
        // const nodeIds = new Set(graphData.nodes.map(node => node.id));
        // nodeIds.forEach((nodeId) => {
        //     graph.dropNode(nodeId);
        // })
        // for (const link of graphData.links) {
        //     const sourceId = link.source;
        //     const targetId = link.target;
        //     const edgeKey = `${sourceId}_${targetId}`;
        //     graph.addEdgeWithKey(edgeKey, sourceId, targetId, {
        //         weight: link.weight || 1,
        //         color: this.DayOrNight ? link.day_color : link.night_color,
        //         day_color: link.day_color,
        //         night_color: link.night_color
        //     });
        // }
        // this.serializeAndSendGraph(graph);
    }

    addNewNodes(nodes: Node[]) {
        const graph = new Graph();
        for (const node of nodes) {
            if (!graph.hasNode(node.id)) {
                const attributes = this.getNodeAttributes(node);
                graph.addNode(node.id, attributes);
            }
        }
        this.serializeAndSendGraph(graph);
    }

    addNewLinks(links: Link[]) {
        self.postMessage({ type: 'GRAPH_LINKS', data: links });

        // const graph = new Graph();
        // for (const link of links) {
        //     const sourceId = link.source;
        //     const targetId = link.target;
        //     const edgeKey = `${sourceId}_${targetId}`;
        //     graph.mergeEdgeWithKey(edgeKey, sourceId, targetId, {
        //         weight: link.weight || 1,
        //         color: this.DayOrNight ? link.day_color : link.night_color,
        //         day_color: link.day_color,
        //         night_color: link.night_color
        //     });
        // }
        // this.serializeAndSendGraph(graph);
    }

    addBoth(graphData: GraphData) {
        const graph = new Graph();
        for (const node of graphData.nodes)
            graph.addNode(
                node.id,
                this.getNodeAttributes(node)
            );

        for (const link of graphData.links) {
            const sourceId = link.source;
            const targetId = link.target;
            const edgeKey = `${sourceId}_${targetId}`;
            graph.addEdgeWithKey(edgeKey, sourceId, targetId, {
                weight: link.weight || 1,
                color: this.DayOrNight ? link.day_color : link.night_color,
                day_color: link.day_color,
                night_color: link.night_color
            });
        }
        this.serializeAndSendGraph(graph);
    }

    clearGraph() {
        this.serializeAndSendGraph(new Graph());
    }

}

export default GraphManipulator;