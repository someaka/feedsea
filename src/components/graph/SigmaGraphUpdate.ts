import { graphLogger as logger } from '../../logger';

import { get } from 'svelte/store';

import { focusedArticleId } from '$lib/stores/stores';
import { isNightMode } from '$lib/stores/night';
import { isForceAtlas } from '$lib/stores/forces';
import { lightDrawDiscNodeHover, darkDrawDiscNodeHover } from './customHover';
import { defaultForceAtlasSettings, defaultForceAtlas2Settings } from '../forces/defaultGraphSettings';

import Graph from "graphology";
import Sigma from "sigma";
import ForceSupervisor from "graphology-layout-force/worker";
import ForceAtlasSupervisor from 'graphology-layout-forceatlas2/worker';

// import forceAtlas2 from "graphology-layout-forceatlas2";

import type { Attributes, EdgeMergeResult, SerializedGraph } from 'graphology-types';
import type { ForceLayoutSettings } from 'graphology-layout-force';
import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';
import type { GraphData, Link, Node } from '$lib/types';


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
    draggedNode: string | null;
    isDragging: boolean;
    settings: Attributes;
    layout: ForceSupervisor | ForceAtlasSupervisor;
    DayOrNight: boolean;
    totalLinkWeight: number;
    linkCount: number;


    constructor() {
        this.container = graphContainer;
        if (!this.container) {
            throw new Error(`Container not found.`);
        }

        this.graph = new Graph();
        this.renderer = new Sigma(this.graph, this.container, {
            renderLabels: true, // Disable automatic label rendering   
            //allowInvalidContainer: true, //shusshes cypress
            labelDensity: 1,
            labelGridCellSize: 150
        });

        this.DayOrNight = get(isNightMode);
        this.updateDayNightMode();

        this.draggedNode = null;
        this.isDragging = false;

        this.layoutType = this.getLayoutType();
        this.layoutSettings = this.getSettings();
        this.settings = {
            isNodeFixed: (_: unknown, attr: Attributes) => attr.highlighted,
            settings: this.layoutSettings
        };
        this.layout = this.setLayout(this.layoutType === "forceAtlas");
        this.totalLinkWeight = 0;
        this.linkCount = 0;

        this.startLayout();
        this.initializeInteractions();
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
            // return forceAtlas2.inferSettings(this.graph);
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
        this.layout.kill();
        if (this.layoutType === 'forceAtlas')
            this.layout = new ForceSupervisor(this.graph, this.settings);
        else
            this.layout = new ForceAtlasSupervisor(this.graph, this.settings);
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
            size: node.size,
            color: node.color,
            label: node.title,
            title: node.title,
        };
    }


    removeNodesById(graphData: GraphData) {
        this.stopLayout();
        const nodeIds = new Set(graphData.nodes.map(node => node.id));
        this.graph.clearEdges();
        this.totalLinkWeight = 0;
        this.linkCount = 0;
        nodeIds.forEach((nodeId) => {
            this.graph.dropNode(nodeId);
        })
        this.addNewLinks(graphData.links);
        this.startLayout();
    }

    addNewNodes(nodes: Node[]) {
        this.stopLayout();
        for (const node of nodes)
            this.graph.addNode(
                node.id,
                this.getNodeAttributes(node)
            );
        this.startLayout();
    }

    getAverageLinkWeight = (): number =>
        Math.max(0.5, this.totalLinkWeight / this.linkCount);

    isSignificantLink = (link: Link): boolean =>
        link.weight > this.getAverageLinkWeight() * 0.9;

    addNewLinks(links: Link[]) {
        this.stopLayout();
        for (const link of links) {
            if (this.isSignificantLink(link)) {
                const sourceId = link.source;
                const targetId = link.target;
                const edgeKey = `${sourceId}_${targetId}`;
                this.graph.addEdgeWithKey(edgeKey, sourceId, targetId, {
                    weight: link.weight,
                    color: this.DayOrNight ? link.day_color : link.night_color,
                    day_color: link.day_color,
                    night_color: link.night_color
                });
                this.totalLinkWeight += link.weight;
                this.linkCount++;
            }
        }
        this.startLayout();
        this.renderer.scheduleRefresh();
    }

    addBoth(graphData: GraphData) {
        this.addNewNodes(graphData.nodes);
        this.addNewLinks(graphData.links);
    }

    addAll(graphData: GraphData) {
        this.stopLayout();
        this.addNewNodes(graphData.nodes);
        for (const link of graphData.links) {
            if (this.isSignificantLink(link)) {
                const sourceId = link.source;
                const targetId = link.target;
                const edgeKey = `${sourceId}_${targetId}`;
                const edgeMergeResult: EdgeMergeResult =
                    this.graph.mergeEdgeWithKey(edgeKey, sourceId, targetId, {
                        weight: link.weight,
                        color: this.DayOrNight ? link.day_color : link.night_color,
                        day_color: link.day_color,
                        night_color: link.night_color
                    });
                if (edgeMergeResult[1]) {
                    this.totalLinkWeight += link.weight;
                    this.linkCount++;
                }
            }
        }
        this.startLayout();
    }


    clearGraph() {
        this.graph.clear();
        this.totalLinkWeight = 0;
        this.linkCount = 0;
        this.renderer.refresh();
    }


    startLayout() {
        this.layout.start();
    }

    stopLayout() {
        if (this.layout.isRunning())
            this.layout.stop();
    }


    updateForceSettings(newSettings: ForceLayoutSettings | ForceAtlas2Settings) {
        this.layoutSettings = { ...this.layoutSettings, ...newSettings };
        this.settings.settings = this.layoutSettings;
        this.saveCurrentSettings();

        this.stopLayout();
        this.layout.kill();
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
                lightDrawDiscNodeHover
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
                darkDrawDiscNodeHover
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

    updateGraphFromSerializedData(serializedData: SerializedGraph) {
        this.graph.import(serializedData, true);
        this.renderer.scheduleRefresh();
    }
}

const updateForceSettings = (newSettings: ForceLayoutSettings | ForceAtlas2Settings) =>
    SigmaGrapUpdate.getInstance()?.updateForceSettings(newSettings);
const updateDayNightMode = () =>
    SigmaGrapUpdate.getInstance()?.updateDayNightMode();
const updateGraphFromSerializedData = (graphData: SerializedGraph) =>
    SigmaGrapUpdate.getInstance()?.updateGraphFromSerializedData(graphData);

const addBoth = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.addBoth(graphData);
const addAll = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.addAll(graphData);
const addNewNodes = (nodes: Node[]) =>
    SigmaGrapUpdate.getInstance()?.addNewNodes(nodes);
const addNewLinks = (links: Link[]) =>
    SigmaGrapUpdate.getInstance()?.addNewLinks(links);
const removeNodesById = (graphData: GraphData) =>
    SigmaGrapUpdate.getInstance()?.removeNodesById(graphData);

const switchLayout = () =>
    SigmaGrapUpdate.getInstance()?.switchLayout();
const clearGraph = () =>
    SigmaGrapUpdate.getInstance()?.clearGraph();

const refreshRenderer = () => SigmaGrapUpdate.getInstance()?.renderer.scheduleRefresh();

export {
    setContainer,
    clearGraph,
    updateDayNightMode,
    updateForceSettings,
    addAll,
    addNewNodes,
    addBoth,
    addNewLinks,
    removeNodesById,
    switchLayout,
    refreshRenderer,
    updateGraphFromSerializedData
};