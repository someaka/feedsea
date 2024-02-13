import axios, { type AxiosResponse } from 'axios';
import { feedsStore } from './stores';
import type { FeedWithUnreadStories } from './types';


export async function callServerCleanUp(): Promise<AxiosResponse> {
    return axios.post('/cleanup', {}, { withCredentials: true });
}

export async function fetchFeeds() {
    const response = await axios.get('/feeds' , { withCredentials: true });
    feedsStore.set(response.data);
}


// queues the selected feed for articles fetching
export async function selectFeed(feed: FeedWithUnreadStories): Promise<AxiosResponse> {
    // Send the selected feed to the server
    return await axios.post("/select-feed", feed, { withCredentials: true });
}


//  NOT HOW THE APP WORKS 
// export async function fetchArticles(feedId) {
//     const response = await axios.get(`/articles/${feedId}`);
//     articlesStore.set(response.data);
// }
