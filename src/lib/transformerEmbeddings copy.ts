import { pipeline } from '@xenova/transformers';
import { embeddingsStore } from '../components/stores/stores';
import type { ArticleType as Article } from '$lib/types';

let articlesQueue: Article[] = [];
let isCooldownActive = false;


const extractor = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-base-en',
    { quantized: true }
);

async function getEmbeddingsForArticles(articles: Article[]): Promise<Record<string, number[]>> {
    const articlesText = articles.map(article => `${article.title} ${article.text}`);
    const vectors = await extractor(articlesText, { pooling: 'mean' });
    const embeddingsList: number[][] = vectors.tolist().flat();

    const embeddingsWithIds = articles.reduce((acc, article, index) => {
        acc[article.id] = embeddingsList[index];
        return acc;
    }, {} as Record<string, number[]>);

    return embeddingsWithIds;
}

async function processQueue() {
    isCooldownActive = true;

    if (articlesQueue.length > 0) {
        try {
            const newEmbeddings = await getEmbeddingsForArticles(articlesQueue);
            // Update the embeddingsStore with the new embeddings
            embeddingsStore.set(newEmbeddings);
            articlesQueue = [];
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