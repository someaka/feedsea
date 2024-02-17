import { embeddingsStore } from '../components/stores/stores';
import type { ArticleType as Article } from '$lib/types';

let articlesQueue: Article[] = [];
let isCooldownActive = false;


const Worker = await import('$lib/embedWorker?worker');
const worker = new Worker.default();

async function getEmbeddingsForArticles(articles: Article[]): Promise<Record<string, number[]>> {
    const articlesText = articles.map(
        article => ({ id: article.id, text: `${article.title} ${article.text}` })
    );
    const textsToSend = articlesText.map(article => article.text);

    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            if (event.data.status === 'complete') {
                const embeddingsList: number[][] = event.data.embeddingsList;
                const embeddingsWithIds = articlesText.reduce((acc, article, index) => {
                    acc[article.id] = embeddingsList[index];
                    return acc;
                }, {} as Record<string, number[]>);
                resolve(embeddingsWithIds);
            } else if (event.data.status === 'error') {
                reject(event.data.error);
            }
        };

        worker.onerror = (error) => {
            reject(error.message);
        };

        worker.postMessage({ text: textsToSend });
    });
}

async function processQueue() {
    isCooldownActive = true;

    if (articlesQueue.length > 0) {
        try {
            const currentQueue = articlesQueue;
            articlesQueue = [];
            const newEmbeddings = await getEmbeddingsForArticles(currentQueue);
            embeddingsStore.update(currentEmbeddings => {
                return { ...currentEmbeddings, ...newEmbeddings };
            });
        } catch (error) {
            console.error('Error processing embeddings:', error);
            // Handle error appropriately
        } finally {
            isCooldownActive = false;
            if (articlesQueue.length > 0) {
                await processQueue();
            }
        }
    }
}


export async function queueNewArticles(articles: Article[]) {
    articlesQueue.push(...articles);

    if (!isCooldownActive) {
        processQueue();
    }
}

export default queueNewArticles;