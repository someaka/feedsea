import { hasSubscriber, removeSubscriber } from '$lib/subscribers';
import { articleEvents } from '$lib/articles';
import type { Article } from '$lib/articles';

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
            const articleFetchedListener = (article: Article) => {
                controller.enqueue(`event: articleFetched\ndata: ${JSON.stringify(article)}\n\n`);
            };

            const jobCompleteListener = () => {
                articleEvents.off('jobComplete', jobCompleteListener);
                articleEvents.off('articleFetched', articleFetchedListener);
                removeSubscriber(clientId);
                controller.terminate();
            };

            articleEvents.on('articleFetched', articleFetchedListener);
            articleEvents.on('jobComplete', jobCompleteListener);
        },
        flush() {
            removeSubscriber(clientId);
        }
    });

    return new Response(stream.readable, { headers });
}
