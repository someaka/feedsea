import { graphLogger as logger } from '../logger';

import Graph from "graphology";
import Sigma from "sigma";

import ForceSupervisor from "graphology-layout-force/worker";
import type { Settings } from 'sigma/settings';
import type { Attributes } from 'graphology-types';

import type { Node, Link } from '$lib/types';

// import { pointArticleFromNode } from "../Feeds/ui/FeedUI";
// import ForceSupervisor from 'graphology-layout-forceatlas2/worker';

//const CHUNK_SIZE = 1000;

let graphContainer: HTMLElement | null;

function setContainer(container: HTMLElement) {
    graphContainer = container;
}

class SigmaGrapUpdate {

    static instance: SigmaGrapUpdate | null = null;

    static getInstance() {
        if(!graphContainer) return;
        if (!this.instance) {
            this.instance = new SigmaGrapUpdate();
        }
        return this.instance;
    }

    container: HTMLElement | null;
    graph: Graph;
    renderer: Sigma;
    defaultDrawHover: Settings["defaultDrawNodeHover"] | undefined;
    draggedNode: string | null;
    isDragging: boolean;
    settings: Attributes;
    layout: ForceSupervisor;
    DayOrNight: number;



    constructor() {
        this.container = graphContainer;
        if (!this.container) {
            throw new Error(`Container not found.`);
        }

        this.graph = new Graph();
        this.renderer = new Sigma(this.graph, this.container, {


            renderLabels: true, // Disable automatic label rendering   
            allowInvalidContainer: true, //shusshes cypress
            labelDensity: 1,
            labelGridCellSize: 150,
            // labelRenderedSizeThreshold: 5, // affects label for node size
            // nodeProgramClasses: {
            //     border: NodeProgramBorder,
            // },
        });
        this.defaultDrawHover = this.renderer.getSetting("defaultDrawNodeHover");
        this.draggedNode = null;
        this.isDragging = false;
        // TODO set up forceatlas2 and different settings for each layout
        this.settings = {
            isNodeFixed: (attr: Attributes) => attr.highlighted,
            settings: {
                attraction: 0.00001,
                repulsion: 0.2,
                gravity: 0.0001,
                inertia: 0.6,
                maxMove: 5
            }
        };
        this.layout = new ForceSupervisor(this.graph, this.settings);
        this.DayOrNight = 1;

        this.startLayout();
        this.initializeInteractions();
    }

    initializeInteractions() {
        this.renderer.on("downNode", (e) => {
            this.isDragging = true;
            this.draggedNode = e.node;
            this.graph.setNodeAttribute(this.draggedNode, "highlighted", true);
        });

        // On mouse move, if the drag mode is enabled, we change the position of the draggedNode
        this.renderer.getMouseCaptor().on("mousemovebody", (e) => {
            if (!this.isDragging || !this.draggedNode) return;

            // Get new position of node
            const pos = this.renderer.viewportToGraph(e);

            this.graph.setNodeAttribute(this.draggedNode, "x", pos.x);
            this.graph.setNodeAttribute(this.draggedNode, "y", pos.y);

            // Prevent sigma to move camera:
            e.preventSigmaDefault();
            e.original.preventDefault();
            e.original.stopPropagation();
        });

        // On mouse up, we reset the autoscale and the dragging mode
        this.renderer.getMouseCaptor().on("mouseup", () => {
            if (this.draggedNode) {
                this.graph.removeNodeAttribute(this.draggedNode, "highlighted");
            }
            this.isDragging = false;
            this.draggedNode = null;
        });

        // Disable the autoscale at the first down interaction
        this.renderer.getMouseCaptor().on("mousedown", () => {
            if (!this.renderer.getCustomBBox()) this.renderer.setCustomBBox(this.renderer.getBBox());
        });


        // this.renderer.on('clickNode', (e) => {
        //     logger.log('Node clicked:', e.node);
        //     this.updateRightPanelWithFeed(e.node);
        // });


    }


    // updateRightPanelWithFeed(nodeId) {
    //     // logger.log('Node clicked:', nodeId);
    //     const nodeData = this.graph.getNodeAttributes(nodeId);
    //     pointArticleFromNode(nodeData.color, nodeId);
    // }



    // Update the getNodeAttributes method to use the new color conversion
    getNodeAttributes(node: Node) {
        return {
            x: node.x,
            y: node.y,
            size: node.size || 10,
            color: node.color,
            // borderColor: chroma(data.color).darken().hex(),
            // borderSize: 2,
            // type: "border",
            // colorhsl: node.color,
            label: node.title,
            title: node.title,
        };
    }



    // Correct the closest node calculation
    // getClosestNodes(coordForGraph, count = 2) {
    //     return this.graph
    //         .nodes()
    //         .map(nodeId => {
    //             const attrs = this.graph.getNodeAttributes(nodeId);
    //             const distance = Math.pow(coordForGraph.x - attrs.x, 2) + Math.pow(coordForGraph.y - attrs.y, 2);
    //             return { nodeId, distance };
    //         })
    //         .sort((a, b) => a.distance - b.distance)
    //         .slice(0, count);
    // }

    // Add methods to add nodes, edges, update the graph, etc.
    // addNode(attributes: Attributes) {
    //     const id = uuid();
    //     this.graph.addNode(id, attributes);
    //     return id;
    // }

    // addEdge(sourceId, targetId) {
    //     this.graph.addEdge(sourceId, targetId);
    // }













    updateGraph(newGraphData: { nodes: Node[], links: Link[] }) {

        const newNodesSet = new Set(newGraphData.nodes.map(node => node.id));

        try {
            this.graph.clearEdges();
            this.removeNodes(newNodesSet);

            this.addNewNodes(newGraphData.nodes);
            this.addNewEdges(newGraphData.links);

            this.renderer.refresh();
        } catch {
            logger.warn("Failed to update graph")
        }
    }

    removeNodes(newNodesSet: Set<string>) {

        this.graph.forEachNode((nodeId) => {
            if (!newNodesSet.has(nodeId)) {
                this.graph.dropNode(nodeId);
            }
        })

    }

    addNewNodes(nodes: Node[]) {
        const defaultNodeSize = 10;

        for (const node of nodes) {
            if (!this.graph.hasNode(node.id)) {

                const attributes = this.getNodeAttributes(node);
                attributes.size = defaultNodeSize;
                this.graph.addNode(node.id, attributes);
            }
        }


    }



    addNewEdges(links: Link[]) {
        for (const link of links) {
            const sourceId = link.source.id;
            const targetId = link.target.id;
            const edgeKey = `${sourceId}_${targetId}`;
            this.graph.addEdgeWithKey(edgeKey, sourceId, targetId, {
                // size: link.size || 1,
                weight: link.weight || 1,
                color: this.DayOrNight ? link.day_color : link.night_color,
                day_color: link.day_color,
                night_color: link.night_color
            });
        }
    }



    clearGraph() {
        // Clear the graph and refresh the renderer
        this.graph.clear();
        this.renderer.refresh();
    }

    startLayout() {
        this.layout.start();
    }

    stopLayout() {
        if (this.layout.isRunning()) {
            this.layout.stop();
        }
    }


    // updateForceSettings(newSettings) {
    //     this.stopLayout();
    //     this.settings.settings = { ...this.settings.settings, ...newSettings };
    //     this.layout = new ForceSupervisor(this.graph, this.settings);
    //     this.startLayout();
    //     this.renderer.refresh();
    //     logger.log('New ForceSupervisor created with settings:', this.settings.settings);
    // }


    updateDayNightMode() {
        if (this.DayOrNight === 0) {
            this.renderer.setSetting("labelColor", {
                //attribute: 'color'
                color: '#000000'
            });
            this.renderer.setSetting("defaultDrawNodeHover",
                this.defaultDrawHover || (() => { })
            );
            this.graph.forEachEdge((edge) => {
                this.graph.updateEdgeAttributes(edge, attr => {
                    attr.color = attr.day_color
                    return attr;
                });
            })

            this.DayOrNight = 1;
        } else if (this.DayOrNight === 1) {
            this.renderer.setSetting("labelColor", {
                //attribute: 'color'
                color: '#FFFFFF'
            });
            this.renderer.setSetting("defaultDrawNodeHover",
                // function that does nothing
                () => { }
            );
            this.graph.forEachEdge((edge) => {
                this.graph.updateEdgeAttributes(edge, attr => {
                    attr.color = attr.night_color
                    return attr;
                });
            })

            this.DayOrNight = 0;
        }
        this.renderer.refresh();
    }
}


const visualizeGraph = (newGraphData: { nodes: Node[], links: Link[] }) =>
    SigmaGrapUpdate.getInstance()?.updateGraph(newGraphData);
const updateDayNightMode = () => SigmaGrapUpdate.getInstance()?.updateDayNightMode();
const clearGraph = () => SigmaGrapUpdate.getInstance()?.clearGraph();
// const updateForceSettings = (newSettings) => SigmaGrapUpdate.getInstance().updateForceSettings(newSettings);


export {
    setContainer,
    visualizeGraph,
    clearGraph,
    updateDayNightMode,
    // updateForceSettings,
};