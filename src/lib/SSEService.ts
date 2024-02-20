
import { articlesStore, selectedFeedsStore } from '../components/stores/stores';
import { decompress } from './compression';
import type { FeedChange } from './types';

let eventSource: EventSource | null = null;

interface articleFetchedResponse {
    feedId: string;
    compressedArticles: string
}

export function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/events');
    eventSource.addEventListener('articleFetched', (event) => {
        const { compressedArticles } = JSON.parse(event.data) as articleFetchedResponse;
        const articlesBatch = decompress(compressedArticles);

        articlesStore.update((currentArticles) => {
            articlesBatch.forEach(article => {
                if (!currentArticles[article.feedId]) {
                    currentArticles[article.feedId] = [];
                }
                currentArticles[article.feedId].push(article);
            });
            return currentArticles;
        });

        selectedFeedsStore.update(({ feedIds }) => {
            const updatedChange: FeedChange = {
                type: 'new',
                feedId: -1,
                articles: articlesBatch
            };
            return { feedIds: feedIds, change: updatedChange };
        });

    });
}

export function stopSSE() {
    if (eventSource) eventSource.close();
}