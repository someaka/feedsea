import type { ArticleType as Article } from '$lib/types';

import axios, { AxiosError } from 'axios';
import { HUGGINGFACE_API_URL, HUGGINGFACE_TOKEN } from './similarityConfig';
import { similLogger as logger } from '../../logger';

const MAX_RETRIES = 5;
const DEFAULT_WAIT_TIME = 30; // in seconds



async function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function retryRequest(articlesWithIds: Article[], retries: number, waitTime: number) {
    const responses: unknown[] = [];
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
                if (statusCode === 503 && i < retries - 1) {
                    const retryWaitTime = error.response.data.estimated_time || waitTime;
                    logger.log(`API is unavailable, retrying in ${retryWaitTime} seconds...`);
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



async function fetchEmbeddingsForArticles(articles: Article[]): Promise<Record<string, number[]>> {

    // async function getEmbeddings(articlesWithIds) {
    if (articles.some(article => article.text == null)) {
        throw new Error('Texts array contains null or undefined values.');
    }

    const responses = await retryRequest(articles, MAX_RETRIES, DEFAULT_WAIT_TIME);
    const embeddings: Record<string, number[]> = {};
    const errors = [];

    for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response instanceof Error) {
            errors.push({ id: articles[i].id, error: response });
            console.warn(`Warning: Failed to retrieve embeddings for article ${articles[i].id}: ${response.message}`);
        } else {
            embeddings[articles[i].id] = response as  number[];
        }
    }

    const truncatedData = truncateDataForLogging(embeddings);
    logger.log('Embeddings retrieved (truncated):', truncatedData);

    return embeddings;
}


function truncateDataForLogging(data: unknown, maxLength = 100) {
    return JSON.stringify(data).substring(0, maxLength) + '...';
}



export default fetchEmbeddingsForArticles