import type { ArticleType as Article } from '$lib/types';
import { articlesToNodes } from '../components/graph/graph';

self.onmessage = (event: MessageEvent<Article[]>) => {
    self.postMessage(articlesToNodes(event.data));
};