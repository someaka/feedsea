import { embeddingsStore } from './stores/stores';
import type { ArticleType as Article, EmbeddingsCache, EmbeddingsState } from '$lib/types';
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

  return new Promise((resolve, reject) => {
    let articlesText: { id: string; text: string }[] | null = task.articles.map(
      article => ({ id: article.id, text: `${article.title} ${article.text}` })
    );
    let textsToSend: string[] | null = articlesText.map(article => article.text);

    worker.onmessage = (event) => {
      if (event.data.status === 'complete') {
        let newEmbeddings: EmbeddingsCache | null =
          (articlesText as { id: string; text: string }[])
            .reduce((acc, article, index) => {
              acc[article.id] = event.data.embeddingsList[index];
              return acc;
            }, {} as EmbeddingsCache);

        if (Object.keys(newEmbeddings).length > 0)
          embeddingsStore.update(currentEmbeddings => {
            return {
              embeddings: { ...currentEmbeddings.embeddings, ...newEmbeddings },
              newEmbeddings
            } as EmbeddingsState;
          });

        newEmbeddings = null;

        resolve();
      } else if (event.data.status === 'error') {
        reject(event.data.error);
      }
    };

    worker.onerror = (error) => {
      reject(error.message);
    };

    worker.postMessage({ text: textsToSend });

    textsToSend = null;
    articlesText = null;
  });
}

const queueWorker = fastq.promise(processArticleTask, 1); // Adjust concurrency as needed

async function queueNewArticles(articles: Article[]) {
  queueWorker.push({ articles });
}

export default queueNewArticles;