import { isActive } from "$lib/articles.js";
import { hasSubscriber } from "$lib/subscribers";

export async function GET({ request }) {
    const cookie = request.headers.get('cookie');
    const clientId = cookie?.split('sessionid=')[2];

    if (!clientId || !hasSubscriber(clientId))
        return new Response(null, { status: 401 });

    if (isActive(clientId))
        return new Response(null, { status: 200 });
}