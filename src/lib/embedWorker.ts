
// import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';
// import type { PipelineType } from '@xenova/transformers';

// class EmbeddingPipeline {
//     static task: PipelineType = 'feature-extraction';
//     static model = 'Xenova/all-MiniLM-L6-v2';
//     static instance: FeatureExtractionPipeline;
//     static errorReported = false; // Flag to track if an error has been reported

//     static async getInstance() {
//         if (!this.instance && !this.errorReported) {
//             try {
//                 this.instance = await pipeline(
//                     this.task,
//                     this.model,
//                     // { quantized: true }
//                 ) as FeatureExtractionPipeline;
//             } catch (error) {
//                 this.errorReported = true; // Mark that an error has been reported
//                 // Instead of throwing, return a specific error object
//                 return { error: "Failed to initialize the embedding pipeline. Please try again later." };
//             }
//         } else if (this.errorReported) {
//             // Return a generic error object without attempting to initialize again
//             return { error: "The embedding pipeline is currently unavailable." };
//         }
//         return this.instance;
//     }
// }

// self.addEventListener('message', async (event) => {
//     const embeddingPipeline: FeatureExtractionPipeline | { error: string } = await EmbeddingPipeline.getInstance();
//     if ('error' in embeddingPipeline) {
//         self.postMessage({ status: 'error', error: embeddingPipeline.error });
//     } else {
//         try {
//             const vectors = await embeddingPipeline(event.data.text, { pooling: 'mean' });
//             const embeddingsList: number[][] = vectors.tolist();
//             self.postMessage({ status: 'complete', embeddingsList });
//         } catch (error) {
//             self.postMessage({ status: 'error', error });
//         }
//     }
// });

// export { }