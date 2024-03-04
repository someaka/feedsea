import type {
    ArticleType as Article,
    Node,
    Link,
    GraphData,
    Pair
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
    nodes: Node[]
    newPairs: Record<string, Pair>
    feedIds: Set<number>
    articles: Record<string, Article[]>
}

interface AddNodesOperationData {
    newArticles: Article[]
    articles: Record<string, Article[]>
    feedIds: Set<number>
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
