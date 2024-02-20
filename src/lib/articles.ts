import axios from 'axios';
import { compress } from './compression';
import { v4 as uuidv4 } from 'uuid';
import { extract } from '@extractus/article-extractor';
import sanitizeHtml from 'sanitize-html';
import type { FeedWithUnreadStories, ArticleType } from './types';
import { EventEmitter } from 'events';
import fastq from 'fastq';
import type { done, queue } from 'fastq';

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
    private activeQueues: queue<ArticleTask>[];

    constructor() {
        this.userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
        this.compress = compress;
        this.articleEvents = new EventEmitter();
        this.activeQueues = [];
    }

    private static instance: Articles | null = null;

    static getInstance(): Articles {
        if (!this.instance) {
            this.instance = new Articles();
        }
        return this.instance;
    }

    private async fetchArticle(task: ArticleTask): Promise<Article> {

        const response = await axios.get(task.story, {
            headers: { 'User-Agent': this.userAgent },
            timeout: BATCH_INTERVAL,
        });

        const articleData = await extract(response.data);
        if (!articleData || !articleData.content || !articleData.title || !articleData.url) {
            throw new Error('Failed to extract article content. No article data returned.');
        }
        const cleanedContent = this.cleanArticleContent(articleData.content);

        const article = new Article();
        article.feedColor = task.feedColor;
        article.feedId = task.feedId;
        article.title = articleData.title;
        article.text = cleanedContent;
        article.url = articleData.url;

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
                    console.error(`Sub-error for feed ${task.feedId}:`, err);
            else console.error(`Error processing task for feed ${task.feedId}:`, error);
        }
        done(null);
    }

    queueFeedRequest(selectedFeed: FeedWithUnreadStories): void {
        const concurrency = 1;
        const requestQueue = fastq(this, this.worker, concurrency);

        const sendBatch = () => {
            if (this.batch.length > 0) {
                const currentBatch = this.batch.splice(0, this.batch.length); 
                const compressedBatch = this.compress(currentBatch);
                this.articleEvents.emit('articleFetched', compressedBatch);
            }
        };
        const batchTimer = setInterval(sendBatch, BATCH_INTERVAL);

        selectedFeed.unreadStories.forEach(story => {
            requestQueue.push(
                {
                    feedId: selectedFeed.id.toString(),
                    feedColor: selectedFeed.color,
                    story
                }
            );
        });

        requestQueue.drain = () => {
            clearInterval(batchTimer);
            sendBatch();
            this.activeQueues = this.activeQueues.filter(q => q !== requestQueue);
        };

        this.activeQueues.push(requestQueue);
    }

    stopAllRequests(): void {
        this.activeQueues.forEach(queue => {
            queue.kill();
        });
        this.activeQueues = [];
    }
}

const articleEvents = Articles.getInstance().articleEvents;

const queueFeedRequest = (selectedFeed: FeedWithUnreadStories) =>
    Articles.getInstance().queueFeedRequest(selectedFeed);

const stopAllRequests = () => Articles.getInstance().stopAllRequests();

export {
    articleEvents,
    queueFeedRequest,
    stopAllRequests
};