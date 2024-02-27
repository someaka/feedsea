// import axios, { type AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
    extract,
    // addTransformations
} from '@extractus/article-extractor';
import sanitizeHtml from 'sanitize-html';
import { EventEmitter } from 'events';
import { compress } from './compression';
import { hasSubscriber, removeSubscriber } from './subscribers';

import fastq from 'fastq';
import type { done, queue } from 'fastq';
import type { FeedWithUnreadStories, ArticleType } from './types';

import { articlesLogger as logger } from '../logger';

const BATCH_INTERVAL = 5000;

interface ArticleTask {
    feedId: string;
    feedColor: string;
    story: string;
}

class Article implements ArticleType {
    id: string;
    feedId: string;
    feedColor: string;
    title: string;
    text: string;
    url: string;

    constructor() {
        this.id = uuidv4();
        this.feedId = '';
        this.feedColor = '';
        this.title = '';
        this.text = '';
        this.url = '';
    }
}

class Articles {
    private userAgent: string;
    private compress: typeof compress;
    public articleEvents: EventEmitter;
    private activeQueues: queue<ArticleTask>[] | null;

    constructor() {
        this.userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
        this.compress = compress;
        this.articleEvents = new EventEmitter();
        this.activeQueues = null;
    }

    private static instances: Map<string, Articles> = new Map();

    static getInstance(clientToken: string): Articles {
        if (!hasSubscriber(clientToken)) {
            throw new Error("Client not subscribed");
        }
        if (!this.instances.has(clientToken)) {
            this.instances.set(clientToken, new Articles());
        }
        return this.instances.get(clientToken)!;
    }

    static destroyInstance(clientToken: string): void {
        if (this.instances.has(clientToken)) {
            this.instances.delete(clientToken);
            removeSubscriber(clientToken);
        }
    }

    private async fetchArticle(task: ArticleTask): Promise<Article> {

        // let response: AxiosResponse | null = await axios.get(task.story, {
        //     headers: { 'User-Agent': this.userAgent },
        //     timeout: BATCH_INTERVAL,
        // });

        // let articleData = await extract(response?.data);

        // addTransformations(
        //     [
        //         {
        //             patterns: [
        //                 /.*/
        //             ],
        //             pre: (document) => {
        //                 // Query all img elements with a srcset attribute
        //                 document.querySelectorAll('img[srcset]').forEach((img) => {
        //                     try {
        //                         // Process or validate the srcset attribute
        //                         // This is a simplification. You might need a more complex logic to validate or fix the srcset values.
        //                         const srcset = img.getAttribute('srcset');
        //                         const validSrcset = srcset?.split(',').map(s => {
        //                             // Example validation/fix: ensure each descriptor has a width (w) or pixel density (x) specifier
        //                             if (!s.trim().endsWith('w') && !s.trim().endsWith('x')) {
        //                                 return ''; // Remove invalid descriptors
        //                             }
        //                             return s.trim();
        //                         }).filter(Boolean).join(', ');

        //                         // Update the srcset attribute with the validated/fixed value
        //                         if (validSrcset) img.setAttribute('srcset', validSrcset);
        //                     } catch (error) {
        //                         console.error('Error processing srcset:', error);
        //                         // Optionally remove the srcset attribute if it's invalid and can't be fixed
        //                         img.removeAttribute('srcset');
        //                     }
        //                 });
        //                 return document;
        //             },
        //             post: (document) => {
        //                 // Any post-processing can be done here
        //                 return document;
        //             }
        //         }
        //     ]
        // );

        let articleData = await extract(task.story, {}, {
            signal: AbortSignal.timeout(BATCH_INTERVAL),
        })

        if (!articleData || !articleData.content || !articleData.title || !articleData.url) {
            throw new Error('Failed to extract article content. No article data returned.');
        }

        const article = new Article();
        article.feedColor = task.feedColor;
        article.feedId = task.feedId;
        article.title = articleData.title;
        article.text = articleData.content; // this.cleanArticleContent(articleData.content);
        article.url = articleData.url;

        // response = null;
        articleData = null;

        return article;

    }

    private cleanArticleContent(content: string): string {
        return sanitizeHtml(content, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                'img': ['src', 'alt'],
            },
            allowedStyles: {},
        });
    }

    private batch: Article[] = [];

    async worker(task: ArticleTask, done: done) {
        try {
            const article = await this.fetchArticle(task);
            this.batch.push(article);
        } catch (error) {
            if (error instanceof AggregateError)
                for (const err of error.errors)
                    logger.error(`Sub-error for feed ${task.feedId}:`, err);
            else logger.error(`Error processing task for feed ${task.feedId}:`, error);
        }
        done(null);
    }

    async queueFeedRequest(selectedFeed: FeedWithUnreadStories): Promise<void> {
        const concurrency = 1;
        let requestQueue: queue<ArticleTask> | null = fastq(this, this.worker, concurrency);
        if (!requestQueue) return;

        const sendBatch = () => {
            if (this.batch.length > 0) {
                const currentBatch = this.batch.splice(0, this.batch.length);
                const compressedBatch = this.compress(currentBatch);
                this.articleEvents.emit('articleFetched', compressedBatch);
            }
        };
        const batchTimer = setInterval(sendBatch, BATCH_INTERVAL);

        const processStoriesInBatches = async () => {
            for (let i = 0; i < selectedFeed.unreadStories.length; i++) {
                if (requestQueue) {
                    requestQueue.push({
                        feedId: selectedFeed.id.toString(),
                        feedColor: selectedFeed.color,
                        story: selectedFeed.unreadStories[i]
                    });

                    // Wait for the queue to drain if it reaches a certain size to control memory usage
                    if (i % concurrency === 0) {
                        await new Promise<void>(resolve => requestQueue!.drain = () => resolve(undefined));
                    }
                }
            }
        };

        await processStoriesInBatches();

        requestQueue.drain = () => {
            clearInterval(batchTimer);
            sendBatch();
            if (this.activeQueues) {
                this.activeQueues = this.activeQueues.filter(q => q !== requestQueue);
                if (this.activeQueues.length === 0) this.activeQueues = null;
            }
            requestQueue = null;
        };

        if (!this.activeQueues) this.activeQueues = [];
        this.activeQueues.push(requestQueue);
    }

    stopAllRequests(): void {
        this.activeQueues?.forEach(queue => {
            queue.kill();
        });
        this.activeQueues = [];
    }
}

const getArticleEvents = (clientToken: string) => Articles.getInstance(clientToken).articleEvents;

const queueFeedRequest = (selectedFeed: FeedWithUnreadStories, clientToken: string) =>
    Articles.getInstance(clientToken).queueFeedRequest(selectedFeed);

const stopAllRequests = (clientToken: string) => Articles.getInstance(clientToken).stopAllRequests();


export {
    Articles,
    getArticleEvents,
    queueFeedRequest,
    stopAllRequests
};