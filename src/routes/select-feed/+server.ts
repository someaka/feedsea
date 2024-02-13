import { queueFeedRequest } from '../../lib/articles';

import type { FeedWithUnreadStories } from '../../lib/types';

export async function POST({ request }) {
  try {
    const feed: FeedWithUnreadStories = await request.json();

    // TODO manage differencet clients
    // Queue the feed request
    queueFeedRequest(feed);

    return new Response('Feed request queued successfully', { status: 200 });
  } catch (error) {
    console.error('Error queuing feed request:', error);
    return new Response('Error processing request', { status: 500 });
  }
}