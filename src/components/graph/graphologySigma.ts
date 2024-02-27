import { graphLogger as logger } from '../../logger';

import Graph from "graphology";
import Sigma from "sigma";

import type { Settings } from 'sigma/settings';
import type { Attributes } from 'graphology-types';

import type { ForceLayoutSettings } from 'graphology-layout-force';
import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';

//mport { defaultForceAtlasSettings, defaultForceAtlas2Settings } from '../forces/defaultGraphSettings';
import type { Node, Link, GraphData } from '$lib/types';

import { focusedArticleId } from '../../lib/stores/stores';

import ForceSupervisor from "graphology-layout-force/worker";
import ForceAtlasSupervisor from 'graphology-layout-forceatlas2/worker';
import { defaultForceAtlasSettings, defaultForceAtlas2Settings } from '../forces/defaultGraphSettings';
import { isForceAtlas } from '$lib/stores/forces';
import { isNightMode } from '$lib/stores/night';
import { get } from 'svelte/store';

//const CHUNK_SIZE = 1000;

let graphContainer: HTMLElement | null;

function setContainer(container: HTMLElement) {
    graphContainer = container;
}



class SigmaGrapUpdate {

    static instance: SigmaGrapUpdate | null = null;

    static getInstance() {
        if (!graphContainer) return;
        if (!this.instance) {
            this.instance = new SigmaGrapUpdate();
        }
        return this.instance;
    }

    container: HTMLElement | null;
    graph: Graph;
    layoutType: string;
    layoutSettings: ForceLayoutSettings | ForceAtlas2Settings;
    renderer: Sigma;
    defaultDrawHover: Settings["defaultDrawNodeHover"] | undefined;
    draggedNode: string | null;
    isDragging: boolean;
    settings: Attributes;
    layout: ForceSupervisor | ForceAtlasSupervisor;
    DayOrNight: boolean;



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

        this.DayOrNight = get(isNightMode);
        this.defaultDrawHover = this.renderer.getSetting("defaultDrawNodeHover");
        this.updateDayNightMode();
        //this.DayOrNight = !this.DayOrNight;

        this.draggedNode = null;
        this.isDragging = false;

        this.layoutType = this.getLayoutType();
        this.layoutSettings = this.getSettings();
        this.settings = {
            isNodeFixed: (_: unknown, attr: Attributes) => attr.highlighted,
            settings: this.layoutSettings
        };
        this.layout = this.setLayout(this.layoutType === "forceAtlas");

        this.startLayout();
        this.initializeInteractions();
    }

    initializeInteractions() {
        this.renderer.on("downNode", (e) => {
            this.isDragging = true;
            this.draggedNode = e.node;
            this.graph.setNodeAttribute(this.draggedNode, "highlighted", true);
        });

        this.renderer.getMouseCaptor().on("mousemovebody", (e) => {
            if (!this.isDragging || !this.draggedNode) return;
            const pos = this.renderer.viewportToGraph(e);

            this.graph.setNodeAttribute(this.draggedNode, "x", pos.x);
            this.graph.setNodeAttribute(this.draggedNode, "y", pos.y);

            e.preventSigmaDefault();
            e.original.preventDefault();
            e.original.stopPropagation();
        });

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

        this.renderer.on('clickNode', (e) => {
            logger.log('Node clicked:', e.node);
            this.updateRightPanelWithFeed(e.node);
        });


    }

    getLayoutType() {
        const layoutType = localStorage.getItem('layoutType');
        if (layoutType) isForceAtlas.update(() => layoutType === 'forceAtlas');
        return layoutType || 'forceAtlas';
    }

    getSettings() {
        if (this.layoutType === 'forceAtlas') {
            const settings = localStorage.getItem('layoutForceSettings');
            return settings ? JSON.parse(settings) : defaultForceAtlasSettings
        } else {
            const settings = localStorage.getItem('layoutFA2Settings');
            return settings ? JSON.parse(settings) : defaultForceAtlas2Settings
        }
    }

    saveCurrentSettings() {
        if (this.layoutType === 'forceAtlas')
            localStorage.setItem('layoutForceSettings', JSON.stringify(this.layoutSettings));
        else
            localStorage.setItem('layoutFA2Settings', JSON.stringify(this.layoutSettings));
    }

    setLayout(res: boolean) {
        return res
            ? new ForceSupervisor(this.graph, this.settings)
            : new ForceAtlasSupervisor(this.graph, this.settings);
    }


    switchLayout() {
        this.saveCurrentSettings()
        const res = 'forceAtlas' !== this.layoutType;

        this.layoutType = !res ? 'forceAtlas2' : 'forceAtlas';
        localStorage.setItem('layoutType', this.layoutType);

        this.layoutSettings = this.getSettings();
        this.settings.settings = this.layoutSettings;

        this.stopLayout();
        this.layout = this.setLayout(res);
        this.startLayout();
        isForceAtlas.update(() => res);
        return res;
    }


    updateRightPanelWithFeed(nodeId: string) {
        focusedArticleId.set(nodeId);
    }


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

    removeNodesById(graphData: GraphData) {
        this.graph.clearEdges();
        const nodeIds = new Set(graphData.nodes.map(node => node.id));
        nodeIds.forEach((nodeId) => {
            this.graph.dropNode(nodeId);
        })
        this.addNewEdges(graphData.links);
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

    addBoth(graphData: GraphData) {
        this.addNewNodes(graphData.nodes);
        this.addNewEdges(graphData.links);
    }

    addAll(graphData: GraphData) {
        this.addNewNodes(graphData.nodes);
        this.graph.clearEdges();
        this.addNewEdges(graphData.links);
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


    updateForceSettings(newSettings: ForceLayoutSettings | ForceAtlas2Settings) {
        this.layoutSettings = { ...this.layoutSettings, ...newSettings };
        this.settings.settings = this.layoutSettings;
        this.saveCurrentSettings();

        this.stopLayout();
        if (this.layoutType === 'forceAtlas')
            this.layout = new ForceSupervisor(this.graph, this.settings);
        else
            this.layout = new ForceAtlasSupervisor(this.graph, this.settings);
        this.startLayout();
    }


    updateDayNightMode() {
        if (!this.DayOrNight) {
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

            this.DayOrNight = true;
        } else if (this.DayOrNight) {
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

            this.DayOrNight = false;
        }
        this.renderer.refresh();
    }
}


const visualizeGraph = (newGraphData: { nodes: Node[], links: Link[] }) =>
    SigmaGrapUpdate.getInstance()?.updateGraph(newGraphData);
const updateDayNightMode = () => SigmaGrapUpdate.getInstance()?.updateDayNightMode();
const clearGraph = () => SigmaGrapUpdate.getInstance()?.clearGraph();
const updateForceSettings = (newSettings: ForceLayoutSettings | ForceAtlas2Settings) =>
    SigmaGrapUpdate.getInstance()?.updateForceSettings(newSettings);

const removeNodes = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.removeNodesById(graphData);
const addNewNodes = (nodes: Node[]) =>
    SigmaGrapUpdate.getInstance()?.addNewNodes(nodes);
const addNewLinks = (links: Link[]) =>
    SigmaGrapUpdate.getInstance()?.addNewEdges(links);
const addBoth = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.addBoth(graphData);
const addAll = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.addAll(graphData);
const switchLayout = () => SigmaGrapUpdate.getInstance()?.switchLayout();

const refreshRenderer = () => SigmaGrapUpdate.getInstance()?.renderer.refresh();

export {
    setContainer,
    visualizeGraph,
    clearGraph,
    updateDayNightMode,
    updateForceSettings,
    removeNodes,
    addNewNodes,
    addNewLinks,
    addBoth,
    addAll,
    switchLayout,
    refreshRenderer
};