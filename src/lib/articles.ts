import axios from 'axios';
import { compress } from './compression';
import { v4 as uuidv4 } from 'uuid';
import { extract } from '@extractus/article-extractor';
import sanitizeHtml from 'sanitize-html';
import fastq from 'fastq';
import type { queue, done } from 'fastq';
import type { FeedWithUnreadStories, ArticleType } from './types';

// import { getSubscriber } from './subscribers';

import { articlesLogger as logger } from '../logger';
import { EventEmitter } from 'events';

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
    private static instance: Articles | null = null;
    private requestQueue: queue<ArticleTask, string>;
    private userAgent: string;
    private compress: typeof compress;

    public articleEvents: EventEmitter;

    private constructor() {
        this.userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
        this.requestQueue = fastq(this, this.worker, 1);
        this.articleEvents = new EventEmitter();
        this.compress = compress;
    }

    static getInstance(): Articles {
        if (!this.instance) {
            this.instance = new Articles();
        }
        return this.instance;
    }

    private async worker(task: ArticleTask, callback: done<string>): Promise<void> {
        try {
            if (task.story === "fetchStarting") {
                this.articleEvents.emit('fetchStarting');
                callback(null);
            } else {
                const article = await this.fetchArticle(task);
                const compressedArticles = this.compress([article]);
                this.articleEvents.emit('articleFetched', task.feedId, compressedArticles,);
                console.log(`Article processed for feed ${task.feedId}: ${task.story}`);
                callback(null, compressedArticles);
            }
        } catch (error) {
            callback(error as Error);
        }
    }

    private async fetchArticle(task: ArticleTask): Promise<Article> {
        const response = await axios.get(task.story, {
            headers: { 'User-Agent': this.userAgent },
            timeout: 5000,
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

    queueFeedRequest(selectedFeed: FeedWithUnreadStories): void {
        this.requestQueue.push({
            feedId: selectedFeed.id.toString(),
            feedColor: selectedFeed.color,
            story: "fetchStarting"
        }, () => {

        });

        selectedFeed.unreadStories.forEach(story => {
            this.requestQueue.push(
                {
                    feedId: selectedFeed.id.toString(),
                    feedColor: selectedFeed.color,
                    story
                },
                (err, result) => {
                    if (!err && result) {
                        // this.articleEvents.emit('jobComplete', result);
                    } else {
                        logger.error(`Error processing article request for feed ${selectedFeed.id}: ${err}`);
                    }
                    // if (this.requestQueue.idle()) {
                    //    // this.articleEvents.emit('jobComplete');
                    // }
                });
        });
    }



    stopAllRequests(): void {
        this.requestQueue.kill();
        logger.log('All queued article requests have been stopped.');
        this.requestQueue = fastq(this, this.worker, 1);
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

