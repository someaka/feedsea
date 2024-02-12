// import { articlesLogger as logger } from '../logger';

// import axios from 'axios';
// import sanitizeHtml from 'sanitize-html';
// import { v4 as uuidv4 } from 'uuid';
// import { extract } from '@extractus/article-extractor';
// import { deflateSync } from 'fflate';
// import { getSubscriber } from './subscribers';


// import fastq from 'fastq';
// import type { done } from "fastq";

// import type { FeedWithUnreadStories } from './feedTypes';

// const BATCHSIZE = 1;






// interface ArticleTask {
//     feedId: string;
//     feedColor: string;
//     story: string;
// }

// interface BatchTask {
//     feedId: string;
//     feedColor: string;
//     stories: string[];
// }

// interface ArticleContent {
//     title: string;
//     text: string;
//     url: string;
// }

// interface ArticleResponse {
//     article: ArticleContent | null;
//     status: string;
//     error: string | null | unknown;
// }

// interface ArticleType {
//     id: string;
//     feedId: string;
//     feedColor: string;
//     title: string;
//     text: string;
//     url: string;
// }

// class Article implements ArticleType {
//     id: string;
//     feedId: string = '';
//     feedColor: string = '';
//     title: string = '';
//     text: string = '';
//     url: string = '';

//     constructor() {
//         this.id = uuidv4();
//     }
// }









// class Articles {
//     static instance: Articles | null = null;
//     static getInstance() {
//         if (!this.instance) {
//             this.instance = new Articles();
//         }
//         return this.instance;
//     }

//     userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';



//     requestQueue = fastq(this, this.worker, BATCHSIZE);

//     async worker(task: ArticleTask, callback: done): Promise<void> {
//         try {
//             const result: ArticleType =
//                 await this.fetchToArticle(task.story, task.feedId, task.feedColor);
//             callback(null, result);
//         } catch (error) {
//             if (error instanceof Error) callback(error);
//         }
//     }


//     batchProcessingQueue = fastq(this, this.batchWorker, 3);

//     async batchWorker(task: BatchTask, callback: done): Promise<void> {
//         const { feedId, feedColor, stories } = task;

//         const validUrls = stories
//             .filter(story =>
//                 typeof story === 'string'
//                 && story.startsWith('http'))

//         const batchResults: ArticleType[] = await Promise.all(validUrls.map(story =>
//             new Promise<ArticleType>((resolve, reject) => {
//                 this.requestQueue.push({ story, feedId, feedColor }, (err, result: ArticleType) => {
//                     if (err) reject(err);
//                     else resolve(result);
//                 });
//             })
//         ));

//         callback(null, batchResults);

//     }





//     async fetchArticle(url: string): Promise<ArticleResponse> {
//         if (typeof url !== 'string') {
//             logger.error(`Invalid URL: ${url}`);
//             return { article: null, status: 'failure', error: 'Invalid URL' };
//         }
//         try {

//             logger.log(`Fetching article: ${url}`);

//             const response = await axios.get(url, {
//                 headers: { 'User-Agent': this.userAgent },
//                 timeout: 5000 // Timeout after  5 seconds
//             });

//             logger.log(`Successfully fetched article: ${url}`);

//             const processedArticle: ArticleContent = await this.processArticle(response.data, url);

//             return { article: processedArticle, status: 'success', error: null };

//         } catch (error) {
//             const err = error instanceof Error ? error.message : error;
//             return { article: null, status: 'failure', error: err };
//         }
//     }



//     async processArticle(htmlData: string, url: string): Promise<ArticleContent> {
//         try {
//             const article = await extract(htmlData);
//             if (!article || !article.content || !article.title || !article.url) {
//                 throw new Error('Failed to extract article content. No article data returned.');
//             }
//             const cleanedContent = this.cleanArticleContent(article.content);
//             return { title: article.title, text: cleanedContent, url: article.url };
//         } catch (error) {
//             if (error instanceof Error)
//                 logger.warn(`An error occurred while extracting the article: ${error.message}`);
//             return { title: '', text: '', url };
//         }
//     }


//     cleanArticleContent(content: string): string {
//         // Define the allowed tags and attributes
//         const clean = sanitizeHtml(content, {
//             allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
//             allowedAttributes: {
//                 ...sanitizeHtml.defaults.allowedAttributes,
//                 'img': ['src', 'alt']
//             },
//             // Do not allow any CSS styles
//             allowedStyles: {}
//         });

//         return clean;
//     }




//     async fetchToArticle(
//         story: string, feedId: string, feedColor: string
//     ): Promise<ArticleType> {

//         const response = await this.fetchArticle(story);
//         const { article: articleContent, status, error } = response;

//         const article: ArticleType = new Article();
//         article.url = story;
//         article.feedId = feedId;
//         article.feedColor = feedColor;

//         if (status === 'success' && articleContent) {
//             article.title = articleContent.title;
//             article.text = articleContent.text;
//         } else {
//             logger.error(`Failed to fetch article: ${story} Error: ${error}`);
//         }

//         return article;

//     }



//     // PREVIOUS VERSION CODE
//     // async fetchArticlesInBatches(
//     //     selectedfeed: FeedWithUnreadStories, batchSize = BATCHSIZE
//     // ): Promise<void> {
//     //     const { id, color: feedColor, unreadStories } = selectedfeed;
//     //     const feedId = id.toString();

//     //     if (
//     //         // this.articleCache.has(feedId) || 
//     //         unreadStories.length === 0
//     //     ) return;

//     //     const batches = [];
//     //     for (let i = 0; i < unreadStories.length; i += batchSize) {
//     //         batches.push(unreadStories.slice(i, i + batchSize));
//     //     }

//     //     batches.forEach(stories => {
//     //         this.batchProcessingQueue.push({ feedId, feedColor, stories });
//     //     });

//     // }


//     queueFeedRequest(clientId: string, selectedFeed: FeedWithUnreadStories) {
//         const { id, color: feedColor, unreadStories } = selectedFeed;
//         const feedId = id.toString();

//         if (unreadStories.length === 0) return;

//         unreadStories.forEach(story => {
//             this.requestQueue.push({ feedId, feedColor, story }, (err, result) => {
//                 if (err) {
//                     console.error(`Error processing article request for feed ${feedId}: ${err}`);
//                 } else {
//                     console.log(`Article processed for feed ${feedId}: ${result}`);
//                     // Here, instead of directly processing the result, we'll queue it for batch sending
//                     this.sendOnBatchReceived(clientId, [result]); // Assuming result is the article data
//                 }
//             });
//         });
//     }




//     sendOnBatchReceived(clientId: string, articles: ArticleType[]) {
//         const compressedArticles = this.compress(articles);
//         const clientController = getSubscriber(clientId);

//         if (clientController) {
//             clientController.enqueue(`data: ${compressedArticles}\n\n`);
//         } else {
//             console.error(`No subscriber found for clientId ${clientId}`);
//         }
//     }





//     compress(articles: ArticleType[]): string {
//         const data = this.articlesToUint8Array(articles);
//         const encoded = deflateSync(data);
//         let base64Data = '';
//         for (let i = 0; i < encoded.length; i++) {
//             base64Data += String.fromCharCode(encoded[i]);
//         }
//         base64Data = btoa(base64Data);
//         return base64Data;
//         //clientRes.write(`event: similarityPairsUpdate\ndata: ${base64Data}\n\n`);
//     }

//     articlesToUint8Array(articles: ArticleType[]): Uint8Array {
//         const jsonStr = JSON.stringify(articles);
//         const encoder = new TextEncoder();
//         return encoder.encode(jsonStr);
//     }

//     mapToUint8Array(map: Map<string, unknown>): Uint8Array {
//         const jsonStr = JSON.stringify([...map]);
//         const encoder = new TextEncoder();
//         return encoder.encode(jsonStr);
//     }

//     recordToUint8Array(record: Record<string, unknown>): Uint8Array {
//         const jsonStr = JSON.stringify(Object.entries(record));
//         const encoder = new TextEncoder();
//         return encoder.encode(jsonStr);
//     }



// }



// const queueFeedRequest = (clientId:string, selectedfeed: FeedWithUnreadStories) =>
//     Articles.getInstance().queueFeedRequest(clientId, selectedfeed);

// const sendOnBatchReceived = () =>
//     Articles.getInstance().sendOnBatchReceived();

// export {
//     queueFeedRequest,
//     sendOnBatchReceived,
// };

// export type {
//     ArticleType as Article
// };