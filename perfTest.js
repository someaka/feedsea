import similarity from 'compute-cosine-similarity';
import { cos_sim } from '@xenova/transformers';


function generateRandomVector(size) {
  return Array.from({ length: size }, () => Math.random());
}

function testPerformance(func, vectorA, vectorB) {
  const startTime = performance.now();
  func(vectorA, vectorB); // We only need to call the function here
  const endTime = performance.now();
  return endTime - startTime;
}

const vectorSize = 384; // Adjust the size of the vectors
const iterations = 1000000; // Number of times to run the test

let similarityTotalTime = 0;
let cosSimTotalTime = 0;

for (let i = 0; i < iterations; i++) {
  const vectorA = generateRandomVector(vectorSize);
  const vectorB = generateRandomVector(vectorSize);

  // Test compute-cosine-similarity
  similarityTotalTime += testPerformance(similarity, vectorA, vectorB);

  // Test @xenova/transformers
  cosSimTotalTime += testPerformance(cos_sim, vectorA, vectorB);
}

console.log(`compute-cosine-similarity Average Time Taken: ${similarityTotalTime / iterations}ms`);
console.log(`@xenova/transformers Average Time Taken: ${cosSimTotalTime / iterations}ms`);