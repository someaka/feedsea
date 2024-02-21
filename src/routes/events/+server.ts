import { hasSubscriber, removeSubscriber } from '$lib/subscribers';
import { articleEvents } from '$lib/articles';
import { serverLogger as logger } from '../../logger.js';

export async function GET({ request }) {
    const cookie = request.headers.get('cookie');
    logger.log("cookie", cookie)
    const clientId = cookie?.split('sessionid=')[2];
    logger.log("clientId", clientId)
    if (!clientId || !hasSubscriber(clientId)) {
        return new Response(null, { status: 401 });
    }

    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    };

    const stream = new TransformStream({
        start(controller) {
            const fetchingStartedListener = () => {
                controller.enqueue(`event: fetchStarting\ndata: ${JSON.stringify("")}\n\n`);
            };

            const articleFetchedListener = (compressedArticles: string) => {
                const eventData = { compressedArticles };
                controller.enqueue(`event: articleFetched\ndata: ${JSON.stringify(eventData)}\n\n`);
            };

            const jobCompleteListener = () => {
                articleEvents.off('fetchStarting', fetchingStartedListener);
                articleEvents.off('articleFetched', articleFetchedListener);
                articleEvents.off('jobComplete', jobCompleteListener);
                removeSubscriber(clientId);
                //controller.enqueue(`event: jobComplete\n\n`);
                controller.terminate();
            };

            // articleEvents.on('fetchStarting', fetchingStartedListener);
            articleEvents.on('articleFetched', articleFetchedListener);
            articleEvents.on('jobComplete', jobCompleteListener);
        },
        flush() {
            // removeSubscriber(clientId);
        }
    });

    return new Response(stream.readable, { headers });
}
