import { stopAllRequests } from '$lib/articles';

export async function POST() {
  stopAllRequests();
  return new Response(null, { status: 200 });
}