import type {
    ArticleType as Article,
    Node,
    Link,
    GraphData
} from '$lib/types';


interface OperationData {
    feedIds: Set<number>
    newFeedId: number
    articles: Record<string, Article[]>
    nodes: Node[]
    links: Link[]
}

interface AllSelectedOperationData {
    articles: Article[]
    nodes: Node[]
    links: Link[]
}

interface AddLinkOperationData {
    newLinks: Link[]
    feedIds: Set<number>
    articles: Record<string, Article[]>
}

interface AddNodesOperationData {
    newNodes: Node[]
    feedIds: Set<number>
    articles: Record<string, Article[]>
}


interface isNightModeData {
    isNightMode: boolean
}
interface GraphOperation {
    type:
    'addNodes'
    | 'addLinks'
    | 'addBoth'
    | 'addAll'
    | 'removeNodes'
    | 'clearGraph'
    | 'themeChange';
    data?:
    isNightModeData
    | Node[] | Link[] | GraphData
    | OperationData
    | AllSelectedOperationData
    | AddLinkOperationData
    | AddNodesOperationData;
}

export type {
    GraphOperation,
    OperationData,
    AllSelectedOperationData,
    AddLinkOperationData,
    AddNodesOperationData
}
