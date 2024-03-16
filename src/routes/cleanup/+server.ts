import { stopAllRequests } from '$lib/articles';
import { getArticleEvents } from '$lib/articles';
import { hasSubscriber } from '$lib/updates/subscribers';

export async function POST({ request }) {
  const cookie = request.headers.get('cookie');
  const clientId = cookie?.split('sessionid=')[2];

  if (!clientId || !hasSubscriber(clientId))
    return new Response(null, { status: 401 });

  const articleEvents = getArticleEvents(clientId);
  stopAllRequests(clientId);
  articleEvents.emit('jobComplete');
  return new Response(null, { status: 200 });
}