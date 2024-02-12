import { stopAllRequests } from '../../lib/articles';

export async function POST() {
  stopAllRequests();
}