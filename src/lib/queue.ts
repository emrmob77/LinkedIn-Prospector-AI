import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from './redis';

const connection = redis;

export const scrapingQueue = new Queue('scraping-queue', { connection });
export const aiProcessingQueue = new Queue('ai-processing-queue', { connection });

export { Queue, Worker, QueueEvents, connection };
