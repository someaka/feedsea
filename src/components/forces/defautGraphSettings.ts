import type { GraphSettings } from '$lib/types';

const defaultGraphSettings: GraphSettings = {
    attraction: 0.00001,
    repulsion: 0.2,
    gravity: 0.0001,
    inertia: 0.6,
    maxMove: 1
}

export default defaultGraphSettings