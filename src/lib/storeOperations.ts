// src/lib/storeOperations.ts
import { get } from 'svelte/store';
import { feedsStore, selectedFeedsStore, articlesStore } from '../stores/stores';

export function selectAllFeeds() {
  const allFeeds = get(feedsStore);
  const allArticles = get(articlesStore);
  selectedFeedsStore.set({ feeds: allArticles, change: { type: 'add', feedId: null, articles: [] } });
}

export function unselectAllFeeds() {
  selectedFeedsStore.set({ feeds: {}, change: { type: 'remove', feedId: null } });
}

export function toggleFeedSelection(feedId: string) {
  selectedFeedsStore.update(({ feeds }) => {
    const updatedFeeds = { ...feeds };
    let updatedChange;

    if (!feeds[feedId]) {
      // Feed is being selected
      updatedFeeds[feedId] = get(articlesStore)[feedId];
      updatedChange = { type: 'add', feedId: feedId, articles: [] };
    } else {
      // Feed is being deselected
      delete updatedFeeds[feedId];
      updatedChange = { type: 'remove', feedId: feedId };
    }

    return { feeds: updatedFeeds, change: updatedChange };
  });
}