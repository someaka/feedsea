import axios, { type AxiosResponse } from 'axios';
import { inflateSync } from 'fflate';

import type { FeedWithUnreadStories } from './feedTypes';
import type { Article } from './articles';


let eventSource: EventSource | null = null;

export async function selectFeed(feed: FeedWithUnreadStories): Promise<AxiosResponse> {
    // Send the selected feed to the server
    return await axios.post("/select-feed", feed, { withCredentials: true });
}

export function setupSSE(
    onArticleFetched: (article: Article) => void,
    onJobComplete: () => void
): void {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`/events`, { withCredentials: true });


    // eventSource.addEventListener('articleFetched', function(event) {
    //     const data = decompress(event.data);
    //     data.forEach(article => onArticleFetched(article));
    // });

    function processMessage(event: { data: string; }) {
        const data = decompress(event.data);
        data.forEach(article => onArticleFetched(article));
    }

    function removeListeners(): void {
        if (eventSource) {
            eventSource.removeEventListener('articleFetched', processMessage);
            eventSource.removeEventListener('jobComplete', cleanupJobComplete);
        }
    }

    function cleanupJobComplete() {
        onJobComplete();
        removeListeners();
    };

    eventSource.addEventListener('articleFetched', processMessage);
    eventSource.addEventListener('jobComplete', cleanupJobComplete);

    eventSource.onerror = (error) => {
        // removeListeners();
        // cleanup();
        console.log("Error receiving article", error);
    }

}

function decompress(compressedArticles: string): Article[] {
    const base64Data = compressedArticles;
    // strip ''
    const strippedBase64Data = base64Data.substring(1, base64Data.length - 1);
    const binaryString = atob(strippedBase64Data);
    const data = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
    }

    const decompressedData = inflateSync(data);
    return uint8ArrayToArticle(decompressedData);
}

function uint8ArrayToArticle(uint8Array: Uint8Array): Article[] {
    try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(uint8Array);
        return JSON.parse(jsonStr) as Article[];
    } catch (error) {
        console.error("Failed to convert Uint8Array to Article[]", error);
        throw error;
    }
}


export function cleanup(): void {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}