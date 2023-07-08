import type { ValidResult, Work } from 'mongo-message-queue';
import MessageQueue from 'mongo-message-queue';
import { PersistentQueue } from '@rocket.chat/models';

import { Logger } from './logger';

/**
 * IPersistentQueue
 *
 * Interface for the necessary methods to write a queue interaction
 */
export interface IPersistentQueue {
	registerWorkers(workType: string, processingMethod: (params: any) => Promise<void>): Promise<void>;
	queueWork<T extends Record<string, unknown>>(workType: string, data: T): Promise<void>;
}

/**
 * QueueWrapper
 *
 * Handles the interaction with the `mongo-message-queue` lib
 */
export class QueueWrapper implements IPersistentQueue {
	protected queue: MessageQueue;

	protected retryCount = 5;

	// Default delay is 5 seconds
	protected retryDelay = 5000;

	private logger = Logger;

	constructor(maxWorkers = 5) {
		this.queue = new MessageQueue();
		this.queue.databasePromise = async () => PersistentQueue.getDb();
		this.queue.collectionName = PersistentQueue.getCollectionName();
		this.queue.maxWorkers = maxWorkers;
	}

	// Registers Workers with the processingMethod for a given type of Work
	public async registerWorkers(workType: string, processingMethod: (params: any) => Promise<void>): Promise<void> {
		this.logger.info(`Registering workers for "${workType}"`);

		this.queue.registerWorker(workType, async (queueItem: Work<{ data: any }>): Promise<ValidResult> => {
			this.logger.info(`Processing queue item ${queueItem._id} for work`);

			try {
				await processingMethod(queueItem.message);
				this.logger.info(`Queue item ${queueItem._id} completed`);

				return 'Completed' as const;
			} catch (err: unknown) {
				const e = err as Error;
				this.logger.error(`Queue item ${queueItem._id} errored: ${e.message}`);
				queueItem.releasedReason = e.message;

				// Let's only retry for `this.retryCount` times
				if ((queueItem.retryCount || 0) < this.retryCount) {
					this.logger.info(`Queue item ${queueItem._id} will be retried in 10 seconds`);
					queueItem.nextReceivableTime = new Date(Date.now() + this.retryDelay);

					return 'Retry' as const;
				}

				this.logger.info(`Queue item ${queueItem._id} will be rejected`);

				return 'Rejected' as const;
			}
		});
	}

	// Queues a work of type "X" to be processed by the Workers
	public async queueWork<T extends Record<string, unknown>>(workType: string, data: T): Promise<void> {
		this.logger.info(`Queueing work for ${workType}`);

		await this.queue.enqueue<typeof data>(workType, { ...data });
	}
}
