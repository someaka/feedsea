import { decompress } from './compression';
import type { ArticleType as Article } from '$lib/types';

let eventSource: EventSource | null = null;



export function setupSSE(
    onArticleFetched: (article: Article | undefined) => void,
    onJobComplete: () => void
): void {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/events`, { withCredentials: true });


    function firstmessage() {
        onArticleFetched(undefined);
    }

    function processMessage(event: { data: string; }) {
        const data = decompress(event.data);
        data.forEach(article => onArticleFetched(article));
    }

    function removeListeners(): void {
        if (eventSource) {
            eventSource.removeEventListener('fetchStarting', firstmessage);
            eventSource.removeEventListener('articleFetched', processMessage);
            eventSource.removeEventListener('jobComplete', cleanupJobComplete);
        }
    }

    function cleanupJobComplete() {
        removeListeners();
        onJobComplete();
    };

    eventSource.addEventListener('fetchStarting', firstmessage);
    eventSource.addEventListener('articleFetched', processMessage);
    eventSource.addEventListener('jobComplete', cleanupJobComplete);

    eventSource.onerror = (error) => {
        // removeListeners();
        // cleanup();
        console.log("Error receiving article", error);
    }

}




export function cleanup(): void {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}