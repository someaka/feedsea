
import { fetchFeeds, fetchStories } from './feedFetcher';
import { generateColors } from './colors';
import type { RequestHandler } from '@sveltejs/kit';
import type { FeedsWithUnreadStories, FeedsWithColor } from '../../lib/feedTypes';


export const GET: RequestHandler = async ({ request }) => {
  const headers = request.headers;
  const sessionCookie = headers.get('cookie');
  if (!sessionCookie) {
    return new Response(null, { status: 401 });
  }

  try {
    const feeds = await getFeeds(sessionCookie);
    return new Response(JSON.stringify(feeds), { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : error;
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }
}

async function getFeeds(sessionCookie: string): Promise<FeedsWithUnreadStories> {
  const data = await fetchFeeds(sessionCookie);
  const feeds = generateColors(data);
  return getStories(sessionCookie, feeds);
}



async function getStories(sessionCookie: string, feeds: FeedsWithColor): Promise<FeedsWithUnreadStories> {
  const feedsWithUnreadStories: FeedsWithUnreadStories = {};

  const promises = Object.keys(feeds).map(async (feedId) => {
    const { color } = feeds[feedId];
    const unreadStories = await fetchStories(sessionCookie, feedId, color);
    feedsWithUnreadStories[feedId] = {
      ...feeds[feedId],
      unreadStories: unreadStories.map(story => story.story_permalink)
    };

  });

  await Promise.all(promises);
  return feedsWithUnreadStories;
}

