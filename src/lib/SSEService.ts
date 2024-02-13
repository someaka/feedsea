
import { articlesStore } from './stores';
import { decompress } from './compression';

let eventSource: EventSource | null = null;

interface articleFetchedResponse {
    feedId: string;
    compressedArticles: string
}

export function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/events');

    eventSource.addEventListener('articleFetched', (event) => {
        const { feedId: id, compressedArticles } = JSON.parse(event.data) as articleFetchedResponse;
        const articlesBatch = decompress(compressedArticles);

        articlesStore.update((articles) => {
            if (!articles[id]) {
                articles[id] = [];
            }
            articles[id] = [...articles[id], ...articlesBatch];
            return articles;
        });
    });

    // Add other event listeners
}

export function stopSSE() {
    if (eventSource) eventSource.close();
}