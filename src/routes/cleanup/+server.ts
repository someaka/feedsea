import { stopAllRequests } from '$lib/articles';
import { articleEvents } from '$lib/articles';


export async function POST() {
  stopAllRequests();
  articleEvents.emit('jobComplete');
  return new Response(null, { status: 200 });
}