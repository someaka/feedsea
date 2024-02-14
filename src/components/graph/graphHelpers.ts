function createPairKey(id1: string, id2: string): string {
    return `${id1}_${id2}`;
}

function reversePairKey(pairKey: string): string {
    const [id1, id2] = pairKey.split('_');
    return `${id2}_${id1}`;
}

export {
    createPairKey,
    reversePairKey
}