import { embeddingsStore } from './stores/stores';
import type { ArticleType as Article, EmbeddingsCache } from '$lib/types';
import fastq from 'fastq';

let worker: Worker;

async function initWorker() {
  const WorkerModule = await import('$lib/embedWorker?worker');
  worker = new WorkerModule.default();
}

initWorker();

interface QueueTask {
  articles: Article[];
}

async function processArticleTask(task: QueueTask): Promise<void> {
  const articlesText = task.articles.map(
    article => ({ id: article.id, text: `${article.title} ${article.text}` })
  );
  const textsToSend = articlesText.map(article => article.text);

  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.status === 'complete') {
        const embeddingsList: number[][] = event.data.embeddingsList;
        const newEmbeddings = articlesText.reduce((acc, article, index) => {
          acc[article.id] = embeddingsList[index];
          return acc;
        }, {} as EmbeddingsCache);

        embeddingsStore.update(currentEmbeddings => {
          return {
             embeddings: {...currentEmbeddings.embeddings, ...newEmbeddings},
             newEmbeddings 
            };
        });

        resolve();
      } else if (event.data.status === 'error') {
        reject(event.data.error);
      }
    };

    worker.onerror = (error) => {
      reject(error.message);
    };

    worker.postMessage({ text: textsToSend });
  });
}

const queueWorker = fastq.promise(processArticleTask, 1); // Adjust concurrency as needed

async function queueNewArticles(articles: Article[]) {
  queueWorker.push({ articles });
}

export default queueNewArticles;