import type { ArticleType as Article } from '$lib/types';
import { articlesToNodes } from '../components/graph/graph';

self.onmessage = (event: MessageEvent<Article[]>) => {
    const newArticles = event.data;
    const newNodes = articlesToNodes(newArticles);
    self.postMessage(newNodes);
};