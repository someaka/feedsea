import type { ArticleType as Article, EmbeddingsCache, EmbeddingsState } from '$lib/types';

import axios, { AxiosError, type AxiosResponse } from 'axios';
import { HUGGINGFACE_API_URL, HUGGINGFACE_TOKEN } from './similarityConfig';
import { similLogger as logger } from '../logger';
import { embeddingsStore } from './stores/stores';

const MAX_RETRIES = 10;
const DEFAULT_WAIT_TIME = 30; // in seconds
const DEFAULT_QUEUE_TIME = 2.5; // in seconds

let articlesQueue: Article[] | null = null;
let isCooldownActive = false;

async function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

type ResponseOrError = AxiosResponse | Error;

async function retryRequest(
    articlesWithIds: Article[], retries: number, waitTime: number
): Promise<ResponseOrError[]> {
    const responses: ResponseOrError[] = [];
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(
                HUGGINGFACE_API_URL,
                { inputs: articlesWithIds.map(article => article.text) },
                { headers: { 'Authorization': `Bearer ${HUGGINGFACE_TOKEN}` } }
            );
            responses.push(...response.data);
            break;
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data.message || error.message;
                logger.log(`API request failed with status code ${statusCode}: ${errorMessage}`);
                if (statusCode === 503 || statusCode === 502 || statusCode === 400 && i < retries - 1) {
                    const retryWaitTime = error.response.data.estimated_time || waitTime;
                    logger.log(`API is unavailable, remaining retries are ${retries - i - 1}, retrying in ${retryWaitTime} seconds...`);
                    await sleep(retryWaitTime);
                } else {
                    responses.push(new Error(`Failed to retrieve embeddings: ${errorMessage}`));
                    break;
                }
            } else {
                logger.log(`API request failed: ${error}`);
                responses.push(new Error(`Failed to retrieve embeddings: ${error}`));
                break;
            }
        }
    }
    return responses;
}



// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchEmbeddingsForArticles(articles: Article[]): Promise<EmbeddingsCache> {
    if (articles.some(article => article.text == null))
        throw new Error('Texts array contains null or undefined values.');

    let responses = null;
    responses = await retryRequest(articles, MAX_RETRIES, DEFAULT_WAIT_TIME);
    const embeddings: EmbeddingsCache = {};

    for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response instanceof Error)
            console.warn(`Warning: Failed to retrieve embeddings for article ${articles[i].id}: ${response.message}`);
        else
            embeddings[articles[i].id] = response as unknown as number[];
    }
    responses = null;

    logger.log('Embeddings retrieved (truncated):', truncateDataForLogging(embeddings));
    return embeddings;
}


let dummyWarned = true;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function dummyFetchEmbeddingsForArticlesDummy(articles: Article[]): Promise<EmbeddingsCache> {
    if (dummyWarned) console.log("REMOVE THIS AS SOON AS HUGGINFACE IS BACK")
    if (articles.some(article => article.text == null))
        throw new Error('Texts array contains null or undefined values.');
    const embeddings: EmbeddingsCache = {};
    for (let i = 0; i < articles.length; i++)
        embeddings[articles[i].id] = Array.from({ length: 384 }, () => Math.random());
    if (dummyWarned) dummyWarned = false;
    return embeddings;
}

function truncateDataForLogging(data: unknown, maxLength = 100) {
    return JSON.stringify(data).substring(0, maxLength) + '...';
}



async function processQueue() {
    if (articlesQueue && articlesQueue.length > 0) {
        isCooldownActive = true;
        try {
            let currentQueue: Article[] | null = articlesQueue.splice(0, articlesQueue.length);
            let newEmbeddings: EmbeddingsCache | null =
                //await dummyFetchEmbeddingsForArticlesDummy(currentQueue);
                await fetchEmbeddingsForArticles(currentQueue);

            embeddingsStore.update((currentEmbeddings) => {
                return {
                    embeddings: { ...currentEmbeddings.embeddings, ...newEmbeddings },
                    newEmbeddings
                } as EmbeddingsState;
            });
            
            currentQueue = null;
            newEmbeddings = null;
        } catch (error) {
            console.error('Error processing embeddings:', error);
        } finally {
            setTimeout(() => {
                isCooldownActive = false;
                if (articlesQueue) {
                    if (articlesQueue.length > 0) processQueue();
                    else articlesQueue = null;
                }
            }, DEFAULT_QUEUE_TIME * 1000);
        }
    }
}


function queueNewArticles(articles: Article[]) {
    if (!articlesQueue) articlesQueue = [];
    articlesQueue.push(...articles);
    if (!isCooldownActive) processQueue();
}

export default queueNewArticles