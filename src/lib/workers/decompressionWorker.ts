import { decompress } from '../compression';

self.addEventListener('message', (event) => {
    const compressedData = event.data;
    const decompressedData = decompress(compressedData);
    self.postMessage(decompressedData);
});