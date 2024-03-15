// import { graphLogger as logger } from '../../logger';

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
// import forceLayout from 'graphology-layout-force';
// import forceAtlas2 from 'graphology-layout-forceatlas2';

import {
    // EdgeLineProgram,
    EdgeClampedProgram
} from 'sigma/rendering';

import type { Attributes, SerializedGraph } from 'graphology-types';
import type { ForceLayoutSettings } from 'graphology-layout-force';
import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';
import type { GraphData, Link, Node } from '$lib/types';
// import { initializeGraphAndRender } from './testLargeGraph';

// type LayoutMapping = { [key: string]: { x: number; y: number } };

let graphContainer: HTMLElement;
let sigmaInstance: Sigma;
let graphInstance: Graph;
let layoutInstance:
    // LayoutMapping;
    ForceSupervisor | ForceAtlasSupervisor;
let layoutType: string = 'forceAtlas';
let layoutSettings: ForceLayoutSettings | ForceAtlas2Settings;
let draggedNode: string | null = null;
let isDragging: boolean = false;
let settings: Attributes;
let DayOrNight: boolean;

// function setContainer(container: HTMLElement) {
//     graphContainer = container;
//     initializeSigmaGraph();
// }

// import EdgeCurveProgram from './thingsandstuff';
// import { initializeGraphAndRender } from './testLargeGraph';

function initializeSigmaGraph(container: HTMLElement) {
    graphContainer = container;

    graphInstance = new Graph();
    sigmaInstance = new Sigma(graphInstance, graphContainer, {
        // renderLabels: true,
        // hideEdgesOnMove: true,
        // allowInvalidContainer: true, //shusshes cypress
        labelDensity: 1,
        labelGridCellSize: 150,
        // edgeLabelFont: "Papyrus",
        // enableEdgeEvents: false,
        edgeProgramClasses: {
            default: EdgeClampedProgram
        }
    });

    DayOrNight = get(isNightMode);
    updateDayNightMode();

    layoutType = getLayoutType();
    layoutSettings = getSettings();
    settings = {
        isNodeFixed: (_: unknown, attr: Attributes) => attr.highlighted,
        settings: layoutSettings
    };
    layoutInstance = setLayout();

    initializeInteractions();
    startLayout();
}

function initializeInteractions() {
    if (!sigmaInstance) return;

    sigmaInstance.on("downNode", (e) => {
        isDragging = true;
        draggedNode = e.node;
        graphInstance.setNodeAttribute(draggedNode, "highlighted", true);
        focusedArticleId.set(e.node);
    });

    sigmaInstance.getMouseCaptor().on("mousemovebody", (e) => {
        if (!isDragging || !draggedNode || !sigmaInstance) return;
        const pos = sigmaInstance.viewportToGraph(e);

        graphInstance.setNodeAttribute(draggedNode, "x", pos.x);
        graphInstance.setNodeAttribute(draggedNode, "y", pos.y);

        e.preventSigmaDefault();
        e.original.preventDefault();
        e.original.stopPropagation();
    });

    sigmaInstance.getMouseCaptor().on("mouseup", () => {
        if (draggedNode) {
            graphInstance?.removeNodeAttribute(draggedNode, "highlighted");
        }
        isDragging = false;
        draggedNode = null;
    });

    sigmaInstance.getMouseCaptor().on("mousedown", () => {
        if (!sigmaInstance.getCustomBBox()) sigmaInstance.setCustomBBox(sigmaInstance.getBBox());
    });
}

function getLayoutType() {
    const loadedLayoutType = localStorage.getItem('layoutType');
    if (loadedLayoutType) isForceAtlas.update(() => loadedLayoutType === 'forceAtlas');
    return loadedLayoutType || 'forceAtlas';
}

function getSettings() {
    if (layoutType === 'forceAtlas') {
        const settings = localStorage.getItem('layoutForceSettings');
        return settings ? JSON.parse(settings) : defaultForceAtlasSettings;
    } else {
        const settings = localStorage.getItem('layoutFA2Settings');
        return settings ? JSON.parse(settings) : defaultForceAtlas2Settings;
    }
}

// function setLayout(res: boolean = layoutType === "forceAtlas") {
//     if (!graphInstance) throw new Error("Graph instance is not initialized.");
//     return res
//         ? forceLayout(graphInstance, {
//             maxIterations: 500,
//             settings: settings.settings
//         })
//         : forceAtlas2(graphInstance, {
//             iterations: 500,
//             settings: forceAtlas2.inferSettings(graphInstance)
//         });
// }

function setLayout(res: boolean = layoutType === "forceAtlas") {
    return res
        ? new ForceSupervisor(graphInstance, settings)
        : new ForceAtlasSupervisor(graphInstance, settings);
}

function addNewNodes(nodes: Node[]) {
    // layoutInstance.kill();
    // sigmaInstance.kill();
    const tempGraph: Graph = new Graph() // graphInstance.copy();
    for (const node of nodes)
    tempGraph.addNode(
            node.id,
            {
                x: node.x,
                y: node.y,
                size: node.size,
                color: node.color,
                label: node.title,
                title: node.title,
            }
        );
    graphInstance.import(tempGraph);
    // taumate();
}

function addNewLinks(links: Link[]) {
    // layoutInstance.kill();
    // sigmaInstance.kill();
    const tempGraph: Graph = graphInstance.emptyCopy();
    for (const link of links)
    tempGraph.addEdgeWithKey(
            `${link.source}_${link.target}`,
            link.source,
            link.target,
            {
                weight: link.weight,
                color: DayOrNight ? link.day_color : link.night_color,
                day_color: link.day_color,
                night_color: link.night_color
            }
        );
    graphInstance.import(tempGraph, true);
    // taumate();
}

// function taumate() {
//     // ({
//     //     renderer: sigmaInstance,
//     //     layoutInstance: layoutInstance
//     // } = initializeGraphAndRender(graphContainer, graphInstance));
//     const box = sigmaInstance.getBBox();
//     sigmaInstance = new Sigma(graphInstance, graphContainer,
//         {
//             labelDensity: 1,
//             labelGridCellSize: 150,
//             edgeProgramClasses: {
//                 default: EdgeClampedProgram
//             }
//         }
//     );
//     sigmaInstance.setCustomBBox(box);
//     initializeInteractions();
//     if (DayOrNight) {
//         sigmaInstance.setSetting("labelColor", { color: '#000000' });
//         sigmaInstance.setSetting("defaultDrawNodeHover", lightDrawDiscNodeHover);
//     } else {
//         sigmaInstance.setSetting("labelColor", { color: '#FFFFFF' });
//         sigmaInstance.setSetting("defaultDrawNodeHover", darkDrawDiscNodeHover);
//     }
//     layoutInstance = setLayout();
//     startLayout();
// }

function removeNodesById(nodes: Set<string>) {
    layoutInstance.kill();
    const tempGraph: Graph = graphInstance.copy();
    nodes.forEach(node => tempGraph.dropNode(node));
    graphInstance = tempGraph;
    sigmaInstance.setGraph(graphInstance);
    layoutInstance = setLayout();
    startLayout();
}

function addAll(graphData: GraphData) {
    if (!graphInstance) return;
    graphInstance.clearEdges();
    addBoth(graphData);
}

function addBoth(graphData: GraphData) {
    if (graphData.nodes.length > 0) addNewNodes(graphData.nodes);
    if (graphData.links.length > 0) addNewLinks(graphData.links);
}

function clearGraph() {
    graphInstance.clear();
    // layoutInstance.kill();
    // sigmaInstance.kill();
    // ({
    //     renderer: sigmaInstance,
    //     layoutInstance: layoutInstance
    // } = initializeGraphAndRender(graphContainer));
}

function startLayout() {
    layoutInstance.start();
}

function stopLayout() {
    if (layoutInstance?.isRunning()) layoutInstance.stop();
}

function updateDayNightMode() {
    if (!sigmaInstance || !graphInstance) return;
    if (!DayOrNight) {
        sigmaInstance.setSetting("labelColor", { color: '#000000' });
        sigmaInstance.setSetting("defaultDrawNodeHover", lightDrawDiscNodeHover);
        graphInstance.forEachEdge((edge) => {
            graphInstance.updateEdgeAttributes(edge, attr => {
                attr.color = attr.day_color;
                return attr;
            });
        });
        DayOrNight = true;
    } else if (DayOrNight) {
        sigmaInstance.setSetting("labelColor", { color: '#FFFFFF' });
        sigmaInstance.setSetting("defaultDrawNodeHover", darkDrawDiscNodeHover);
        graphInstance.forEachEdge((edge) => {
            graphInstance.updateEdgeAttributes(edge, attr => {
                attr.color = attr.night_color;
                return attr;
            });
        });
        DayOrNight = false;
    }
    //sigmaInstance.refresh();
}

function updateGraphFromSerializedData(serializedData: SerializedGraph) {
    if (!graphInstance || !sigmaInstance) return;
    graphInstance.import(serializedData, true);
    //sigmaInstance.scheduleRefresh();
}

function updateForceSettings(newSettings: ForceLayoutSettings | ForceAtlas2Settings) {
    if (!layoutSettings || !settings) return;
    layoutSettings = { ...layoutSettings, ...newSettings };
    settings.settings = layoutSettings;
    saveCurrentSettings();
    stopLayout();
    layoutInstance.kill();
    layoutInstance = setLayout();
    startLayout();
}

function saveCurrentSettings() {
    if (layoutType === 'forceAtlas')
        localStorage.setItem('layoutForceSettings', JSON.stringify(layoutSettings));
    else
        localStorage.setItem('layoutFA2Settings', JSON.stringify(layoutSettings));
}

function switchLayout() {
    saveCurrentSettings();
    const res = layoutType === 'forceAtlas';
    layoutType = res ? 'forceAtlas2' : 'forceAtlas';
    localStorage.setItem('layoutType', layoutType);
    layoutSettings = getSettings();
    settings.settings = layoutSettings;
    stopLayout();
    layoutInstance.kill();
    layoutInstance = setLayout();
    startLayout();
    isForceAtlas.update(() => !res);
    return res;
}

// function refreshRenderer() {
//     sigmaInstance?.scheduleRefresh();
// }

// Additional helper functions if needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getNodeAttributes(node: Node) {
    return {
        x: node.x,
        y: node.y,
        size: node.size,
        color: node.color,
        label: node.title,
        title: node.title,
    };
}

export {
    // setContainer,
    initializeSigmaGraph,
    clearGraph,
    updateDayNightMode,
    updateForceSettings,
    addBoth,
    addNewNodes,
    addNewLinks,
    removeNodesById,
    switchLayout,
    // refreshRenderer,
    updateGraphFromSerializedData,
    addAll
};