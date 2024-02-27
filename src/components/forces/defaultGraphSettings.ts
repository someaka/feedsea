// import type { GraphSettings } from '$lib/types';
import type { ForceLayoutSettings } from 'graphology-layout-force';
import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';

const defaultForceAtlasSettings: ForceLayoutSettings = {
    attraction: 0.00001,
    repulsion: 0.01,
    gravity: 0.0001,
    inertia: 0.6,
    maxMove: 1
};

const defaultForceAtlas2Settings: ForceAtlas2Settings = {
    linLogMode: false,
    outboundAttractionDistribution: false,
    adjustSizes: false,
    edgeWeightInfluence: 0,
    scalingRatio: 1,
    strongGravityMode: false,
    gravity: 0.05,
    slowDown: 1,
    barnesHutOptimize: false,
    barnesHutTheta: 0.5
};

export { defaultForceAtlasSettings, defaultForceAtlas2Settings };