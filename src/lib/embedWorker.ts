import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';
import type { PipelineType } from '@xenova/transformers';

class EmbeddingPipeline {
    static task: PipelineType = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: FeatureExtractionPipeline;

    static async getInstance() {
        if (!this.instance) {
            this.instance = await pipeline(
                this.task,
                this.model,
                // { quantized: true }
            ) as FeatureExtractionPipeline;
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    try {
        const embeddingPipeline = await EmbeddingPipeline.getInstance();
        const vectors = await embeddingPipeline(event.data.text, { pooling: 'mean' });
        const embeddingsList: number[][] = vectors.tolist();
        self.postMessage({ status: 'complete', embeddingsList });
    } catch (error) {
        self.postMessage({ status: 'error', error: error });
    }
});

export {}