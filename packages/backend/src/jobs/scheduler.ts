/**
 * Job Scheduler
 *
 * Manages background job scheduling using node-cron.
 * Handles:
 * - Daily attribution job (midnight)
 * - Job status tracking
 * - Manual job triggering
 * - Error handling and notifications
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { runDailyAttributionJob } from './attribution.job';

/**
 * Job status tracking
 */
export interface JobStatus {
    name: string;
    lastRun: Date | null;
    lastStatus: 'success' | 'failed' | 'running' | 'never_run';
    lastError: string | null;
    nextRun: Date | null;
    runCount: number;
    failCount: number;
}

/**
 * Scheduled job configuration
 */
interface ScheduledJob {
    task: ScheduledTask;
    status: JobStatus;
}

// Store for all scheduled jobs
const scheduledJobs: Map<string, ScheduledJob> = new Map();

/**
 * Calculates the next run time for a cron expression
 */
function getNextRunTime(cronExpression: string): Date | null {
    // Parse the cron expression to calculate next run
    // For simplicity, we'll estimate based on common patterns
    const now = new Date();

    // For daily midnight job (0 0 * * *)
    if (cronExpression === '0 0 * * *') {
        const nextRun = new Date(now);
        nextRun.setHours(0, 0, 0, 0);
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        return nextRun;
    }

    return null;
}

/**
 * Wraps a job function with status tracking
 */
function wrapJobWithTracking<T>(
    jobName: string,
    jobFn: () => Promise<T>
): () => Promise<void> {
    return async () => {
        const job = scheduledJobs.get(jobName);
        if (!job) return;

        job.status.lastStatus = 'running';
        job.status.lastRun = new Date();
        job.status.runCount++;

        logger.info('Scheduler', `Starting job: ${jobName}`, {
            runNumber: job.status.runCount,
        });

        try {
            await jobFn();
            job.status.lastStatus = 'success';
            job.status.lastError = null;

            logger.info('Scheduler', `Job completed: ${jobName}`);
        } catch (error) {
            job.status.lastStatus = 'failed';
            job.status.lastError = error instanceof Error ? error.message : 'Unknown error';
            job.status.failCount++;

            logger.error('Scheduler', `Job failed: ${jobName}`, { error });
        }
    };
}

/**
 * Initializes all scheduled jobs
 * Call this when the server starts
 */
export function initializeScheduler(): void {
    logger.info('Scheduler', 'Initializing job scheduler');

    // Schedule daily attribution job at midnight
    scheduleJob(
        'daily-attribution',
        '0 0 * * *', // Every day at midnight
        runDailyAttributionJob
    );

    logger.info('Scheduler', 'Job scheduler initialized', {
        jobCount: scheduledJobs.size,
        jobs: Array.from(scheduledJobs.keys()),
    });
}

/**
 * Schedules a new job
 */
export function scheduleJob<T>(
    name: string,
    cronExpression: string,
    jobFn: () => Promise<T>
): void {
    // Stop existing job if present
    if (scheduledJobs.has(name)) {
        stopJob(name);
    }

    const status: JobStatus = {
        name,
        lastRun: null,
        lastStatus: 'never_run',
        lastError: null,
        nextRun: getNextRunTime(cronExpression),
        runCount: 0,
        failCount: 0,
    };

    const wrappedJob = wrapJobWithTracking(name, jobFn);

    const task = cron.schedule(cronExpression, wrappedJob, {
        timezone: 'Asia/Manila', // Adjust to your timezone
    });

    scheduledJobs.set(name, { task, status });

    logger.info('Scheduler', `Job scheduled: ${name}`, {
        cronExpression,
        nextRun: status.nextRun,
    });
}

/**
 * Stops a scheduled job
 */
export function stopJob(name: string): void {
    const job = scheduledJobs.get(name);
    if (job) {
        job.task.stop();
        scheduledJobs.delete(name);
        logger.info('Scheduler', `Job stopped: ${name}`);
    }
}

/**
 * Stops all scheduled jobs
 */
export function stopAllJobs(): void {
    for (const [name, job] of scheduledJobs) {
        job.task.stop();
        logger.info('Scheduler', `Job stopped: ${name}`);
    }
    scheduledJobs.clear();
    logger.info('Scheduler', 'All jobs stopped');
}

/**
 * Manually triggers a job to run immediately
 */
export async function triggerJob(name: string): Promise<boolean> {
    const job = scheduledJobs.get(name);
    if (!job) {
        logger.warn('Scheduler', `Job not found: ${name}`);
        return false;
    }

    logger.info('Scheduler', `Manually triggering job: ${name}`);

    // Run the wrapped job
    const wrappedJob = wrapJobWithTracking(name, async () => {
        if (name === 'daily-attribution') {
            await runDailyAttributionJob();
        }
    });

    await wrappedJob();
    return true;
}

/**
 * Gets the status of a specific job
 */
export function getJobStatus(name: string): JobStatus | null {
    const job = scheduledJobs.get(name);
    return job ? { ...job.status } : null;
}

/**
 * Gets the status of all scheduled jobs
 */
export function getAllJobStatuses(): JobStatus[] {
    const statuses: JobStatus[] = [];
    for (const job of scheduledJobs.values()) {
        statuses.push({ ...job.status });
    }
    return statuses;
}

/**
 * Gets list of scheduled job names
 */
export function getScheduledJobNames(): string[] {
    return Array.from(scheduledJobs.keys());
}
