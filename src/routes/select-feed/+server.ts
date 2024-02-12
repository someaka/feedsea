import { queueFeedRequest } from '../../lib/articles';
import { addSubscriber, hasSubscriber } from '$lib/subscribers';

import type { FeedWithUnreadStories } from '../../lib/feedTypes';

export async function POST({ request }) {
  try {
    const clientId = request.headers.get('cookie')?.split('=')[2]; 
    if (!clientId) {
      return new Response(null, { status: 401 });
    }

    const feed: FeedWithUnreadStories = await request.json();
    if(!hasSubscriber(clientId)) addSubscriber(clientId);

    // TODO manage differencet clients
    // Queue the feed request
    queueFeedRequest(feed);

    return new Response('Feed request queued successfully', { status: 200 });
  } catch (error) {
    console.error('Error queuing feed request:', error);
    return new Response('Error processing request', { status: 500 });
  }
}