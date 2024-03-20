import ForceGraph3D from '3d-force-graph';
import type { ForceGraph3DInstance } from '3d-force-graph';
import type { GraphData, Node, Link } from '$lib/types';
import type { Renderer } from 'three';
import {
    CSS3DRenderer,
    // CSS3DSprite
} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// import SpriteText from "three-spritetext";
import { focusedArticleId } from '$lib/stores/stores';

type Settings = { [key: string]: number };

const defaultForce3DSettings: Settings = {
    attraction: 1,
    repulsion: 1,
    gravity: 1
}

let layoutSettings: { [key: string]: number } = getSettings();

let graphInstance: ForceGraph3DInstance;
const graphData: GraphData = { nodes: [], links: [] };

const renderer = new CSS3DRenderer();
renderer.setSize(100, 150);

function initializeGraph(container: HTMLElement) {
    graphInstance = ForceGraph3D({
        extraRenderers: [renderer as unknown as Renderer]
    })(container)
        .backgroundColor('#000000')
        .nodeColor('color')
        .nodeLabel('title')

        // .nodeThreeObject(node => {
        //     const nodeEl = document.createElement('div');
        //     // Assuming the article's text is in the node's text property
        //     let nodeText = (node as { text: string }).text as string;
        //     // Modify links to open in a new tab
        //     nodeText = nodeText.replace(/<a href="([^"]+)"/g, '<a href="$1" target="_blank"');
        //     nodeEl.innerHTML = nodeText;
        //     nodeEl.style.color = 'white';
        //     nodeEl.className = 'node-label';

        //     // Style adjustments
        //     nodeEl.style.pointerEvents = 'auto'; // Make the div not capture click events
        //     nodeEl.style.background = 'rgba(0, 0, 0, 0.7)'; // Optional: Add background to enhance readability
        //     nodeEl.style.padding = '10px'; // Optional: Add some padding
        //     nodeEl.style.borderRadius = '5px'; // Optional: Round corners
        //     nodeEl.style.color = '#fff'; // Optional: Text color
        //     // Ensure the text wraps and is fully visible
        //     nodeEl.style.whiteSpace = 'normal';
        //     nodeEl.style.textAlign = 'left'; // Align text for readability
        //     nodeEl.style.fontSize = '14px'; // Adjust font size as needed

        //     const st = new SpriteText((node as { title: string }).title);
        //     st.material.depthWrite = false; // make sprite background transparent
        //     st.color = (node as { color: string }).color;
        //     st.textHeight = 8;

        //     const sprite = new CSS3DSprite(nodeEl);
        //     return sprite.add(st);
        // })

        // .nodeThreeObject(node => {
        //     const sprite = new SpriteText((node as { title: string }).title);
        //     sprite.material.depthWrite = false; // make sprite background transparent
        //     sprite.color = (node as { color: string }).color;
        //     sprite.textHeight = 8;
        //     return sprite;
        // })

        .nodeThreeObjectExtend(true)
        .linkCurveRotation('rotation')
        .linkCurvature(parseFloat('weight'))
        .linkOpacity(parseFloat('weight'))
        .linkColor('color')
        .width(1920)
        .height(1080)
        .onNodeClick(clickedNode => {
            focusedArticleId.set((clickedNode as { id: string }).id)
            const node = clickedNode as { x: number; y: number; z: number };
            const distance = 500;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

            const newPos = (node).x || node.y || node.z
                ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
                : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

            graphInstance.cameraPosition(
                newPos, // new position
                node,
                200  // ms transition duration
            );
        }
        )
        .graphData(graphData)


    // graphInstance.d3Force('charge')?.strength(-100);
    const bloomPass = new UnrealBloomPass(
        new Vector2(1920, 1080), 0.1, 10, 0
    );
    graphInstance.postProcessingComposer().addPass(bloomPass);
}

function addNodes(nodes: Node[]) {
    graphData.nodes.push(...nodes);
    graphInstance.graphData(graphData);
}

function addLinks(links: Link[]) {
    for (const link of links) graphData.links.push(link);
    graphInstance.graphData(graphData);
}

function removeNodesById(nodeIds: Set<string>) {
    graphData.nodes = graphData.nodes.filter(node => !nodeIds.has(node.id));
    graphData.links = graphData.links.filter(link => !nodeIds.has(link.source) && !nodeIds.has(link.target));
    graphInstance.graphData(graphData);
}


function addBoth(graphData: GraphData) {
    if (graphData.nodes.length > 0) addNodes(graphData.nodes);
    if (graphData.links.length > 0) addLinks(graphData.links);
}

function clearGraph() {
    graphData.nodes = [];
    graphData.links = [];
    graphInstance.graphData(graphData);
}

function redrawLinks(links: Link[]) {
    if (links.length > 0) {
        const copiedLinks = structuredClone(links);
        graphData.links = [];
        addLinks(copiedLinks);
    }
}


function updateForceSettings(newSettings: Settings) {
    layoutSettings = { ...layoutSettings, ...newSettings };
    saveCurrentSettings();
    graphInstance.d3Force('link')?.distance(layoutSettings.repulsion * 1000);
    graphInstance.d3Force('charge')?.strength(layoutSettings.attraction * 1000);
    graphInstance.d3Force('center')?.strength(layoutSettings.gravity * 1000);
    graphInstance.numDimensions(3);
}

function getSettings() {
    const settings = localStorage.getItem('layoutForce3DSettings');
    return settings ? JSON.parse(settings) : defaultForce3DSettings;
}


function saveCurrentSettings() {
    localStorage.setItem('layoutForce3DSettings', JSON.stringify(layoutSettings));
}

function dummy() { }

export {
    addBoth as addAll,
    addBoth,
    redrawLinks,
    clearGraph,
    initializeGraph,
    addNodes,
    addLinks,
    removeNodesById,
    dummy as switchLayout,
    dummy as updateDayNightMode,
    updateForceSettings
};