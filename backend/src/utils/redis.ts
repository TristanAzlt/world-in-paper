import { createClient, type RedisClientType } from 'redis';
import { env } from '../config';
import { logError, logInfo } from './log';

let redisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType {
    if (!redisClient) {
        redisClient = createClient({ url: env.REDIS_URL });
        redisClient.on('error', (error) => {
            logError(`[Redis] ${error}`);
        });
    }

    return redisClient;
}

export async function connectRedis(): Promise<RedisClientType> {
    const client = getRedisClient();

    if (!client.isOpen) {
        await client.connect();
        logInfo(`[Redis] connected to ${env.REDIS_URL}`);
    }

    return client;
}

export async function closeRedis(): Promise<void> {
    if (redisClient?.isOpen) {
        await redisClient.quit();
        logInfo('[Redis] disconnected');
    }
}
