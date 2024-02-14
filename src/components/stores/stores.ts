import { writable } from 'svelte/store';

import type {
   FeedWithUnreadStories,
   ArticleType as Article,
   SelectedFeedsState
} from '$lib/types';


const feedCache: Record<string, FeedWithUnreadStories> = {};
const articleCache: Record<string, Article[]> = {};

export const feedsStore = writable(feedCache);
export const articlesStore = writable(articleCache);


const initialState: SelectedFeedsState = {
   feeds: {},
   change: undefined
};

export const selectedFeedsStore = writable<SelectedFeedsState>(initialState);
