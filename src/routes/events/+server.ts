import { hasSubscriber, removeSubscriber } from '$lib/subscribers';
import { articleEvents } from '$lib/articles';


export async function GET({ request }) {
    const clientId = request.headers.get('cookie')?.split('=')[2];
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

            const articleFetchedListener = (feedId: string, compressedArticles: string) => {
                const eventData = { feedId, compressedArticles };
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

            articleEvents.on('fetchStarting', fetchingStartedListener);
            articleEvents.on('articleFetched', articleFetchedListener);
            articleEvents.on('jobComplete', jobCompleteListener);
        },
        flush() {
            // removeSubscriber(clientId);
        }
    });

    return new Response(stream.readable, { headers });
}
